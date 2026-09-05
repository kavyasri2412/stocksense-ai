import os
import json
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy import func
from backend.config import Config
from backend.database import db_session
from backend.models import Product, Inventory, Sale, Supplier, Store, AIQueryHistory
from backend.services.analytics_engine import AnalyticsEngine
from backend.services.alert_engine import AlertEngine
from backend.services.simulator_engine import SimulatorEngine

class AICopilotService:
    @staticmethod
    @staticmethod
    def _call_gemini_api(system_instruction, user_prompt):
        """
        Invokes Google Gemini API with system instructions and verified data.
        Uses REST API via requests to avoid SDK gRPC and SSL certificate bugs on Windows.
        """
        api_key = Config.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None

        import requests
        import urllib3
        urllib3.disable_warnings()

        # Supported models list with fallback
        requested_model = Config.GEMINI_MODEL or "gemini-flash-latest"
        models_to_try = ["gemini-flash-latest", "gemini-2.5-flash", requested_model, "gemini-1.5-flash"]
        seen = set()
        models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "system_instruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1500}
            }

            try:
                resp = requests.post(url, json=payload, verify=False, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                print(f"Gemini API ({model_name}) status: {resp.status_code}")
            except Exception as e:
                print(f"Gemini REST API Error ({model_name}): {e}")

        return None

    @staticmethod
    def answer_query(user_query, store_id=None):
        """
        Grounds user queries into verified database records and analytics,
        then synthesizes a structured, evidence-backed answer.
        """
        ref_date = AnalyticsEngine.get_reference_date()
        thirty_days_ago = ref_date - timedelta(days=30)
        query_lower = user_query.lower().strip()

        # Gather relevant verified context
        products_count = db_session.query(Product).count()
        sales_count = db_session.query(Sale).count()

        # Database empty status tracking for context
        db_is_empty = (products_count == 0 and sales_count == 0)

        # Retrieve verified database snapshots
        alert_data = AlertEngine.evaluate_all_alerts(store_id)
        kpi_data = AnalyticsEngine.get_dashboard_kpis(store_id)
        anomalies = AnalyticsEngine.detect_sales_anomalies(days_window=7, comparison_days=30, store_id=store_id)
        categories = AnalyticsEngine.get_category_performance(days=30, store_id=store_id)
        best_worst = AnalyticsEngine.get_best_and_worst_selling_products(days=30, limit=10, store_id=store_id)

        # Detect specific product mentions in query
        matched_product = None
        if not db_is_empty:
            for p in db_session.query(Product).all():
                if p.product_name.lower() in query_lower or p.product_id.lower() in query_lower:
                    matched_product = p
                    break

        # Check for general chat / general knowledge / math queries
        general_triggers = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "what is 2+2", "2+2", "2 + 2", "what is ai", "what is artificial intelligence", "who are you", "what can you do", "help"]
        retail_keywords = ["stock", "product", "inventory", "sale", "sales", "revenue", "sku", "reorder", "supplier", "order", "runway", "alert", "sell", "unit", "item", "performance", "drop", "spike", "overstock", "buy", "purchase", "demand", "category", "store", "risk"]

        has_retail_keywords = any(rk in query_lower for rk in retail_keywords)

        intent = "general_overview"
        context_payload = {}
        products_involved = []
        date_range_str = f"{thirty_days_ago.isoformat()} to {ref_date.isoformat()}"

        if any(gt in query_lower for gt in general_triggers) or not has_retail_keywords:
            intent = "general_chat"
            context_payload = {
                "user_query": user_query,
                "is_general_query": True,
                "database_is_empty": db_is_empty
            }

        elif any(w in query_lower for w in ["run out", "running out", "stock out", "stockout", "deplete"]):
            intent = "stockout_risk"
            critical_items = [p for p in alert_data["todays_priorities"] if p["priority_level"] in ("Critical", "High") or p["current_stock"] == 0]
            context_payload = {
                "critical_stockouts": critical_items,
                "total_at_risk_revenue": alert_data["total_revenue_at_risk"],
                "database_is_empty": db_is_empty
            }
            products_involved = [p["product_name"] for p in critical_items[:5]]

        elif any(w in query_lower for w in ["reorder", "order today", "buy", "purchase"]):
            intent = "reorder_recommendation"
            reorder_items = [p for p in alert_data["todays_priorities"] if "reorder" in p["recommended_action"].lower()]
            context_payload = {
                "reorder_candidates": reorder_items,
                "total_revenue_at_risk": alert_data["total_revenue_at_risk"],
                "database_is_empty": db_is_empty
            }
            products_involved = [p["product_name"] for p in reorder_items[:5]]

        elif any(w in query_lower for w in ["overstock", "excess", "too much stock"]):
            intent = "overstock_analysis"
            overstocked = [a for a in alert_data["alerts"] if a["alert_type"] == "Overstock"]
            context_payload = {"overstocked_items": overstocked, "database_is_empty": db_is_empty}
            products_involved = [p["product_name"] for p in overstocked[:5]]

        elif any(w in query_lower for w in ["priority", "highest priority", "attention", "today's priority"]):
            intent = "priority_ranking"
            top_priorities = alert_data["todays_priorities"][:5]
            context_payload = {"top_priorities": top_priorities, "database_is_empty": db_is_empty}
            products_involved = [p["product_name"] for p in top_priorities]

        elif any(w in query_lower for w in ["drop", "sales drop", "decline", "fell", "drop in sales"]):
            intent = "sales_drop"
            drops = anomalies["sales_drops"]
            context_payload = {"sales_drops": drops, "database_is_empty": db_is_empty}
            products_involved = [p["product_name"] for p in drops[:5]]

        elif any(w in query_lower for w in ["spike", "faster", "fast selling", "surge", "selling fast"]):
            intent = "sales_spike"
            spikes = anomalies["sales_spikes"]
            context_payload = {"sales_spikes": spikes, "database_is_empty": db_is_empty}
            products_involved = [p["product_name"] for p in spikes[:5]]

        elif matched_product or any(w in query_lower for w in ["perform", "performance", "how did"]):
            intent = "product_deepdive"
            if matched_product:
                sim = SimulatorEngine.simulate_product_scenario(matched_product.product_id, demand_change_pct=0, future_days=30)
                vel = AnalyticsEngine.get_sales_velocity(matched_product.product_id, days=30, store_id=store_id)
                context_payload = {
                    "product": matched_product.to_dict(),
                    "velocity_30d": vel,
                    "runway_simulation": sim["baseline"],
                    "database_is_empty": db_is_empty
                }
                products_involved = [matched_product.product_name]
            else:
                context_payload = {
                    "top_performers": best_worst["best_sellers"][:5],
                    "categories": categories,
                    "database_is_empty": db_is_empty
                }
                products_involved = [p["product_name"] for p in best_worst["best_sellers"][:5]]

        elif any(w in query_lower for w in ["what if", "demand increase", "demand decrease", "simulation"]):
            intent = "what_if_simulation"
            target_prod = matched_product or (db_session.query(Product).first() if not db_is_empty else None)
            if target_prod:
                sim = SimulatorEngine.simulate_product_scenario(target_prod.product_id, demand_change_pct=25.0, future_days=30)
                context_payload = {"simulation_result": sim, "database_is_empty": db_is_empty}
                products_involved = [target_prod.product_name]
            else:
                context_payload = {"database_is_empty": db_is_empty}

        elif any(w in query_lower for w in ["why is", "high risk", "evidence", "behind this"]):
            intent = "evidence_explanation"
            top_risk = alert_data["revenue_at_risk"][:3]
            context_payload = {"risk_evidence": top_risk, "database_is_empty": db_is_empty}
            products_involved = [p["product_name"] for p in top_risk]

        else:
            intent = "general_kpi"
            context_payload = {
                "dashboard_kpis": kpi_data,
                "top_categories": categories[:3],
                "top_sellers": best_worst["best_sellers"][:3],
                "database_is_empty": db_is_empty
            }

        # System Instruction for Gemini with strict rules
        system_instruction = (
            "You are StockSense AI Copilot, an expert retail inventory & sales intelligence assistant. "
            "INSTRUCTIONS:\n"
            "1. For general questions (greetings, math like 2+2, general knowledge like AI definitions), answer directly, accurately, and naturally.\n"
            "2. For retail and inventory questions, base your answer on the provided verified JSON database records.\n"
            "3. If the user asks about retail data and the database is empty (database_is_empty=true), clearly state that no retail or inventory data is currently available in the database.\n"
            "4. Structure retail answers clearly using markdown formatting with bullet points and bold highlights."
        )

        user_prompt = f"""
User Query: "{user_query}"
Reference Evaluation Date: {ref_date.isoformat()}
Evaluation Date Range: {date_range_str}
Intent Detected: {intent}
Database Empty: {db_is_empty}

VERIFIED DATABASE DATA:
{json.dumps(context_payload, indent=2, default=str)}

Provide a direct, helpful, and executive-ready answer to the User Query.
"""

        # Call Gemini or Deterministic Synthesizer
        ai_response_text = AICopilotService._call_gemini_api(system_instruction, user_prompt)

        if not ai_response_text:
            # Deterministic Fallback Synthesis based on exact Python calculations
            ai_response_text = AICopilotService._generate_deterministic_answer(intent, context_payload, ref_date, user_query)

        # Build Structured Output Bundle
        response_bundle = {
            "query_id": str(uuid.uuid4()),
            "user_query": user_query,
            "direct_answer": ai_response_text,
            "intent": intent,
            "date_range": date_range_str,
            "products_involved": products_involved,
            "context_data": context_payload,
            "evidence": {
                "source_tables": ["products", "inventory", "sales", "suppliers", "stores"],
                "calculation_engine": "Python Deterministic Engine v2.4",
                "grounded_ai_model": Config.GEMINI_MODEL if Config.GEMINI_API_KEY else "StockSense Grounded Analytics Engine",
                "timestamp": datetime.utcnow().isoformat()
            },
            "created_at": datetime.utcnow().isoformat()
        }

        # Save to database query history
        AICopilotService._save_history(user_query, ai_response_text, response_bundle)

        return response_bundle

    @staticmethod
    def _generate_deterministic_answer(intent, payload, ref_date, user_query=""):
        """
        High quality, fully deterministic grounded template when Gemini API key is absent or API is offline.
        """
        q_lower = (user_query or "").lower().strip()
        db_is_empty = payload.get("database_is_empty", False)

        if intent == "general_chat":
            if any(m in q_lower for m in ["2+2", "2 + 2"]):
                return "2 + 2 = 4"
            elif any(g in q_lower for g in ["hi", "hello", "hey", "greetings"]):
                return "Hello! I am StockSense AI Copilot, your retail inventory and sales analytics assistant. How can I help you today?"
            elif any(a in q_lower for a in ["artificial intelligence", "what is ai"]):
                return "Artificial Intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence, such as pattern recognition, data analysis, and decision-making. StockSense AI uses intelligent analytics and AI models to assist with demand forecasting, inventory reorder recommendations, and stockout risk detection."
            elif any(w in q_lower for w in ["who are you", "what can you do"]):
                return "I am StockSense AI Copilot. I help you monitor inventory levels, detect stock-out risks, recommend reorders, analyze sales trends, and optimize stock runway."
            else:
                return f"I am StockSense AI Copilot. How can I assist you with your store inventory or sales analytics today?"

        if db_is_empty:
            return "There is currently no product or inventory data available in the database. Please add or import inventory records to view detailed stock risk and sales analytics."

        if intent == "stockout_risk":
            items = payload.get("critical_stockouts", [])
            if not items:
                return "Good news! There are currently no products at immediate risk of stock-out based on current sales velocity."
            lines = [f"**{len(items)} product(s)** require immediate attention to prevent or resolve stock-outs:\n"]
            for it in items[:4]:
                lines.append(f"- **{it['product_name']}** ({it['category']}): Current Stock = **{it['current_stock']} units**, ADS = **{it['average_daily_sales']} units/day**, Runway = **{it['days_remaining']} days**, Lead Time = **{it['lead_time_days']} days**. Revenue at risk: **${it['revenue_at_risk']:,.2f}**.")
            lines.append(f"\n**Recommended Action:** Immediately issue purchase orders for products with runway under supplier lead times.")
            return "\n".join(lines)

        elif intent == "reorder_recommendation":
            items = payload.get("reorder_candidates", [])
            if not items:
                return "All active products have sufficient stock relative to their reorder thresholds and supplier lead times."
            lines = [f"Found **{len(items)} product(s)** recommended for reorder today:\n"]
            for it in items[:5]:
                lines.append(f"- **{it['product_name']}**: Stock **{it['current_stock']}** (Reorder Threshold: {it['reorder_level']}). Suggested Reorder Qty: **{it['reorder_quantity']} units**. Priority: **{it['priority_level']}**.")
            lines.append("\n**Reasoning:** Reorder is triggered when current inventory falls below threshold or when runway is less than supplier delivery lead time.")
            return "\n".join(lines)

        elif intent == "overstock_analysis":
            items = payload.get("overstocked_items", [])
            if not items:
                return "No overstocked products detected. Inventory turnover is currently within normal operating limits (under 60 days of stock)."
            lines = [f"Detected **{len(items)} overstocked product(s)** holding excess working capital:\n"]
            for it in items[:4]:
                lines.append(f"- **{it['product_name']}** ({it['category']}): Metric = **{it['metric_value']}**. Action: {it['action']}.")
            lines.append("\n**Recommended Action:** Implement promotional bundling or seasonal discounts to accelerate inventory velocity and free up cash flow.")
            return "\n".join(lines)

        elif intent == "sales_drop":
            items = payload.get("sales_drops", [])
            if not items:
                return "No significant sales drops (>50% below baseline) detected across active products in the last 7 days."
            lines = [f"Detected **{len(items)} product(s)** with notable sales velocity drop in the last 7 days:\n"]
            for it in items[:4]:
                lines.append(f"- **{it['product_name']}**: Sales velocity decreased by **{it['percent_change']}%** (Recent ADS: {it['recent_ads']}/day vs Baseline: {it['baseline_ads']}/day).")
            lines.append("\n**Recommended Action:** Check stock placement, competitor pricing, or seasonal seasonality factors.")
            return "\n".join(lines)

        elif intent == "sales_spike":
            items = payload.get("sales_spikes", [])
            if not items:
                return "No unusual sales spikes (>50% jump above 30-day baseline) detected in the last 7 days."
            lines = [f"Found **{len(items)} product(s)** experiencing a demand surge:\n"]
            for it in items[:4]:
                lines.append(f"- **{it['product_name']}**: Sales surged by **+{it['percent_change']}%** (Recent ADS: {it['recent_ads']}/day vs Baseline: {it['baseline_ads']}/day). Total units sold last 7d: **{it['recent_units_sold']}**.")
            lines.append("\n**Recommended Action:** Verify remaining stock to ensure fast sales do not result in an unexpected stock-out.")
            return "\n".join(lines)

        elif intent == "priority_ranking":
            items = payload.get("top_priorities", [])
            lines = ["Here is today's top prioritized action list based on financial impact, stockout risk, and lead time:\n"]
            for it in items[:5]:
                lines.append(f"- **[{it['priority_level'].upper()}] {it['product_name']}**: {it['reason']} -> **{it['recommended_action']}** (Revenue at risk: ${it['revenue_at_risk']:,.2f})")
            return "\n".join(lines)

        elif intent == "product_deepdive":
            p = payload.get("product")
            v = payload.get("velocity_30d", {})
            r = payload.get("runway_simulation", {})
            if p:
                return (
                    f"**Performance Breakdown for {p['product_name']} ({p['category']}):**\n\n"
                    f"- **Selling Price:** ${p['selling_price']:,.2f} | **Cost Price:** ${p['cost_price'] or 0.0:,.2f}\n"
                    f"- **30-Day Sales:** {v.get('total_units_sold', 0)} units (${v.get('total_revenue', 0.0):,.2f} revenue)\n"
                    f"- **Daily Sales Velocity (ADS):** {v.get('average_daily_sales', 0.0)} units/day\n"
                    f"- **Current Stock:** {r.get('current_stock', 0)} units\n"
                    f"- **Stock Runway:** {r.get('coverage_days', 'N/A')} days\n"
                    f"- **Supplier Lead Time:** {p['lead_time_days']} days\n\n"
                    f"**Recommendation:** " + ("Restock recommended immediately." if r.get('coverage_days', 99) <= p['lead_time_days'] else "Stock level is adequate for current sales pace.")
                )
            return "Product records analyzed successfully."

        else:
            kpis = payload.get("dashboard_kpis", {})
            return (
                f"**StockSense AI Store Overview (As of {ref_date.isoformat()}):**\n\n"
                f"- **Total Revenue (30D):** ${kpis.get('revenue_30d', 0.0):,.2f}\n"
                f"- **Today's Revenue:** ${kpis.get('today_revenue', 0.0):,.2f}\n"
                f"- **Total Active SKUs:** {kpis.get('total_products', 0)}\n"
                f"- **Total Inventory Units:** {kpis.get('total_inventory_units', 0):,} units (${kpis.get('current_inventory_value', 0.0):,.2f} cost value)\n"
                f"- **Critical / Low Stock SKUs:** {kpis.get('low_stock_products', 0)}\n"
                f"- **Products Requiring Attention:** {kpis.get('products_requiring_attention_today', 0)}\n\n"
                f"Ask specific questions such as *'What products are running out?'* or *'What should I reorder today?'* for targeted insights."
            )

    @staticmethod
    def _save_history(user_query, answer, data):
        try:
            hist = AIQueryHistory(
                query_id=str(uuid.uuid4()),
                user_query=user_query,
                generated_answer=answer,
                supporting_data=json.dumps(data, default=str),
                created_at=datetime.utcnow()
            )
            db_session.add(hist)
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            print(f"Error saving AI query history: {e}")
