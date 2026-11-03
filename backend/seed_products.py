"""
Seed script for Glow & Glam product catalogue and default administrator.
Idempotent: running multiple times never duplicates products or users.
"""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from decimal import Decimal
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import Product, User
from backend.security import hash_password

SAMPLE_PRODUCTS = [
    # Makeup
    {
        "name": "Velvet Matte Lipstick - Crimson Rose",
        "description": "Richly pigmented, non-drying velvet matte lipstick infused with hydrating vitamin E and jojoba oil for all-day vibrant wear.",
        "category": "Makeup",
        "price": Decimal("899.00"),
        "original_price": Decimal("1199.00"),
        "discount_pct": 25,
        "stock": 85,
        "image_url": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
        "rating": "4.8",
        "reviews_count": "142",
        "is_active": True,
    },
    {
        "name": "Luminous Silk Liquid Foundation",
        "description": "Weightless medium-to-full buildable coverage foundation that imparts a natural lit-from-within radiant glow.",
        "category": "Makeup",
        "price": Decimal("1699.00"),
        "original_price": Decimal("2199.00"),
        "discount_pct": 22,
        "stock": 60,
        "image_url": "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&w=800&q=80",
        "rating": "4.7",
        "reviews_count": "98",
        "is_active": True,
    },
    # Skincare
    {
        "name": "Hyaluronic Acid Hydrating Serum",
        "description": "Multi-molecular hyaluronic acid serum that delivers deep continuous hydration and plumps tired, dehydrated skin.",
        "category": "Skincare",
        "price": Decimal("1299.00"),
        "original_price": Decimal("1699.00"),
        "discount_pct": 23,
        "stock": 90,
        "image_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
        "rating": "4.9",
        "reviews_count": "210",
        "is_active": True,
    },
    {
        "name": "Vitamin C Brightening Facial Elixir",
        "description": "Potent 15% active Vitamin C antioxidant serum targeting dark spots, hyperpigmentation, and premature aging.",
        "category": "Skincare",
        "price": Decimal("1499.00"),
        "original_price": Decimal("1999.00"),
        "discount_pct": 25,
        "stock": 75,
        "image_url": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
        "rating": "4.8",
        "reviews_count": "165",
        "is_active": True,
    },
    # Haircare
    {
        "name": "Argan & Macadamia Repair Hair Mask",
        "description": "Ultra-nourishing deep conditioning treatment enriched with pure cold-pressed Moroccan argan oil and botanical keratin.",
        "category": "Haircare",
        "price": Decimal("1199.00"),
        "original_price": Decimal("1599.00"),
        "discount_pct": 25,
        "stock": 65,
        "image_url": "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
        "rating": "4.6",
        "reviews_count": "89",
        "is_active": True,
    },
    {
        "name": "Rosemary Scalp & Root Revitalizing Oil",
        "description": "Stimulating Ayurvedic botanical infusion promoting strong roots, reduced hair fall, and healthy scalp balance.",
        "category": "Haircare",
        "price": Decimal("849.00"),
        "original_price": Decimal("1099.00"),
        "discount_pct": 22,
        "stock": 110,
        "image_url": "https://images.unsplash.com/photo-1608248597359-58b68832a875?auto=format&fit=crop&w=800&q=80",
        "rating": "4.7",
        "reviews_count": "134",
        "is_active": True,
    },
    # Fragrances
    {
        "name": "Velvet Amber & Vanilla Eau de Parfum",
        "description": "A warm, intoxicating evening scent opening with spiced pink pepper and melting into rich amber, tonka bean, and Madagascar vanilla.",
        "category": "Fragrances",
        "price": Decimal("3299.00"),
        "original_price": Decimal("4499.00"),
        "discount_pct": 26,
        "stock": 40,
        "image_url": "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
        "rating": "4.9",
        "reviews_count": "178",
        "is_active": True,
    },
    {
        "name": "Blossom Bloom Light Floral Mist",
        "description": "Crisp morning jasmine, soft pear blossom, and fresh aquatic peony notes for an effortless daily aura.",
        "category": "Fragrances",
        "price": Decimal("1899.00"),
        "original_price": Decimal("2499.00"),
        "discount_pct": 24,
        "stock": 55,
        "image_url": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        "rating": "4.5",
        "reviews_count": "72",
        "is_active": True,
    },
    # Fashion
    {
        "name": "Tiered Floral Chiffon Maxi Dress",
        "description": "Breezy pastel floral maxi dress with delicate flutter sleeves, cinched waistline, and fluid hemline.",
        "category": "Fashion",
        "price": Decimal("2499.00"),
        "original_price": Decimal("3499.00"),
        "discount_pct": 28,
        "stock": 45,
        "image_url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80",
        "rating": "4.8",
        "reviews_count": "119",
        "is_active": True,
    },
    # Jewellery
    {
        "name": "Handcrafted Kundan & Pearl Choker Set",
        "description": "Artisanal gold-plated choker necklace featuring uncut polki kundan stones, emerald beads, and matching earrings.",
        "category": "Jewellery",
        "price": Decimal("2899.00"),
        "original_price": Decimal("3999.00"),
        "discount_pct": 27,
        "stock": 35,
        "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
        "rating": "4.9",
        "reviews_count": "88",
        "is_active": True,
    },
    # Bags
    {
        "name": "Structured Vegan Leather Top-Handle Tote",
        "description": "Sophisticated pebbled vegan leather tote featuring polished gold hardware, dual top handles, and detachable crossbody strap.",
        "category": "Bags",
        "price": Decimal("2999.00"),
        "original_price": Decimal("4299.00"),
        "discount_pct": 30,
        "stock": 40,
        "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
        "rating": "4.7",
        "reviews_count": "95",
        "is_active": True,
    },
    # Beauty accessories
    {
        "name": "Rose Quartz Facial Sculpting Roller & Gua Sha Set",
        "description": "Authentic natural Brazilian rose quartz dual-ended roller and heart-shaped gua sha tool to boost microcirculation and lymphatic drainage.",
        "category": "Beauty accessories",
        "price": Decimal("999.00"),
        "original_price": Decimal("1499.00"),
        "discount_pct": 33,
        "stock": 120,
        "image_url": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80",
        "rating": "4.8",
        "reviews_count": "153",
        "is_active": True,
    },
    # Gift sets
    {
        "name": "Radiant Glow Luxury Pamper Gift Hamper",
        "description": "Curated indulgence gift box including aromatherapy bath salts, rose facial mist, whipped body butter, and a pure soy hand-poured candle.",
        "category": "Gift sets",
        "price": Decimal("2499.00"),
        "original_price": Decimal("3299.00"),
        "discount_pct": 24,
        "stock": 50,
        "image_url": "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=800&q=80",
        "rating": "5.0",
        "reviews_count": "64",
        "is_active": True,
    },
]


def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed or ensure admin user exists
        admin_email = "admin@glowandglam.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                full_name="Glow & Glam Administrator",
                email=admin_email,
                phone="+91 9876543200",
                hashed_password=hash_password("Admin@Glow2026"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print(f"[SEED] Created administrator: {admin_email}")
        else:
            if admin.role != "admin":
                admin.role = "admin"
                db.commit()
            print(f"[SEED] Administrator already exists: {admin_email}")

        # 2. Check existing products count
        total_existing = db.query(Product).count()
        print(f"[SEED] Database currently has {total_existing} existing products.")

        # 3. Add sample products idempotently by name
        added = 0
        for item in SAMPLE_PRODUCTS:
            exists = db.query(Product).filter(Product.name == item["name"]).first()
            if not exists:
                prod = Product(
                    name=item["name"],
                    description=item["description"],
                    category=item["category"],
                    price=item["price"],
                    original_price=item.get("original_price"),
                    discount_pct=item.get("discount_pct"),
                    stock=item.get("stock", 50),
                    image_url=item.get("image_url"),
                    rating=item.get("rating", "4.5"),
                    reviews_count=item.get("reviews_count", "50"),
                    is_active=item.get("is_active", True),
                )
                db.add(prod)
                added += 1

        db.commit()
        new_total = db.query(Product).count()
        print(f"[SEED] Added {added} new sample products. Total products now in database: {new_total}.")
        return new_total

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed products: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
