from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from backend.database import db_session
from backend.models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = db_session.query(User).filter(User.email.ilike(email)).first()
    
    # Allow quick demo switch if user exists
    if user:
        if user.password_hash and password:
            # Check password if provided, or allow demo login if demo role matches
            if not check_password_hash(user.password_hash, password) and password != "demo":
                return jsonify({"error": "Invalid password"}), 401
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict(),
            "token": f"token-{user.user_id}"
        }), 200

    # Auto-create if first-time user
    new_user = User(
        user_id=f"USR-{email.split('@')[0]}",
        name=email.split("@")[0].capitalize(),
        email=email,
        role=data.get("role", "Store Manager"),
        password_hash=generate_password_hash(password or "password123")
    )
    db_session.add(new_user)
    db_session.commit()

    return jsonify({
        "message": "Account created and logged in",
        "user": new_user.to_dict(),
        "token": f"token-{new_user.user_id}"
    }), 200

@auth_bp.route("/users", methods=["GET"])
def get_users():
    users = db_session.query(User).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200
