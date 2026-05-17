#!/usr/bin/env python3
"""
Smart Price Update Script for ICD-10 Drug Lens Database
Uses fuzzy matching to intelligently match SFDA prices with existing drugs
"""

import pandas as pd
import mysql.connector
from fuzzywuzzy import fuzz
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'icd10_search_engine')
    )

def load_sfda_data(file_path):
    """Load SFDA price data from Excel"""
    df = pd.read_excel(file_path)
    # Clean column names
    df.columns = ['scientific_name', 'trade_name', 'strength', 'pharmaceutical_form', 'price']
    # Remove rows with null prices
    df = df.dropna(subset=['price'])
    # Convert price to float
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df.dropna(subset=['price'])
    return df

def normalize_name(name):
    """Normalize drug names for comparison"""
    if pd.isna(name):
        return ""
    return str(name).strip().upper()

def find_best_match(sfda_row, db_drugs, threshold=75):
    """
    Find best matching drug in database using fuzzy matching
    Returns (db_drug_id, match_score, match_type)
    """
    sfda_sci = normalize_name(sfda_row['scientific_name'])
    sfda_trade = normalize_name(sfda_row['trade_name'])
    
    best_score = 0
    best_match = None
    best_type = None
    
    for db_drug in db_drugs:
        db_id = db_drug['id']
        db_sci = normalize_name(db_drug['scientific_name'])
        db_trade = normalize_name(db_drug['trade_name'])
        
        # Strategy 1: Exact match on scientific name
        if sfda_sci and db_sci and sfda_sci == db_sci:
            return (db_id, 100, 'exact_scientific')
        
        # Strategy 2: Exact match on trade name
        if sfda_trade and db_trade and sfda_trade == db_trade:
            return (db_id, 100, 'exact_trade')
        
        # Strategy 3: Fuzzy match on scientific name (high weight)
        if sfda_sci and db_sci:
            sci_score = fuzz.token_set_ratio(sfda_sci, db_sci)
            if sci_score > best_score:
                best_score = sci_score
                best_match = db_id
                best_type = 'fuzzy_scientific'
        
        # Strategy 4: Fuzzy match on trade name
        if sfda_trade and db_trade:
            trade_score = fuzz.token_set_ratio(sfda_trade, db_trade)
            if trade_score > best_score:
                best_score = trade_score
                best_match = db_id
                best_type = 'fuzzy_trade'
        
        # Strategy 5: Combined fuzzy match
        if sfda_sci and db_sci and sfda_trade and db_trade:
            combined = (fuzz.token_set_ratio(sfda_sci, db_sci) * 0.6 + 
                       fuzz.token_set_ratio(sfda_trade, db_trade) * 0.4)
            if combined > best_score:
                best_score = combined
                best_match = db_id
                best_type = 'combined_fuzzy'
    
    if best_score >= threshold:
        return (best_match, best_score, best_type)
    return None

def update_prices(sfda_file):
    """Main function to update prices"""
    print("=" * 80)
    print("ICD-10 Drug Lens - Smart Price Update")
    print("=" * 80)
    
    # Load SFDA data
    print("\n📥 Loading SFDA price data...")
    sfda_df = load_sfda_data(sfda_file)
    print(f"✓ Loaded {len(sfda_df)} drugs from SFDA")
    
    # Connect to database
    print("\n🔗 Connecting to database...")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Fetch all drugs from database
    print("📊 Fetching database drugs...")
    cursor.execute("SELECT id, scientific_name, trade_name, price FROM drug_lens")
    db_drugs = cursor.fetchall()
    print(f"✓ Loaded {len(db_drugs)} drugs from database")
    
    # Statistics
    stats = {
        'total_sfda': len(sfda_df),
        'total_db': len(db_drugs),
        'matched': 0,
        'updated': 0,
        'high_confidence': 0,
        'medium_confidence': 0,
        'low_confidence': 0,
        'no_match': 0,
        'price_changes': []
    }
    
    # Process each SFDA drug
    print("\n🔍 Matching and updating prices...")
    for idx, sfda_row in sfda_df.iterrows():
        if (idx + 1) % 1000 == 0:
            print(f"  Progress: {idx + 1}/{len(sfda_df)}")
        
        match_result = find_best_match(sfda_row, db_drugs, threshold=75)
        
        if not match_result:
            stats['no_match'] += 1
            continue
        
        db_id, score, match_type = match_result
        stats['matched'] += 1
        
        # Categorize confidence
        if score >= 95:
            stats['high_confidence'] += 1
        elif score >= 85:
            stats['medium_confidence'] += 1
        else:
            stats['low_confidence'] += 1
        
        # Get current price from DB
        current_db = next((d for d in db_drugs if d['id'] == db_id), None)
        current_price = current_db['price'] if current_db else None
        new_price = str(sfda_row['price'])
        
        # Update if price is different
        if current_price != new_price:
            cursor.execute(
                "UPDATE drug_lens SET price = %s, updatedAt = NOW() WHERE id = %s",
                (new_price, db_id)
            )
            stats['updated'] += 1
            stats['price_changes'].append({
                'id': db_id,
                'scientific_name': sfda_row['scientific_name'],
                'trade_name': sfda_row['trade_name'],
                'old_price': current_price,
                'new_price': new_price,
                'match_type': match_type,
                'confidence': score
            })
    
    # Commit changes
    conn.commit()
    
    # Print report
    print("\n" + "=" * 80)
    print("📋 UPDATE REPORT")
    print("=" * 80)
    print(f"\nTotal SFDA drugs: {stats['total_sfda']}")
    print(f"Total DB drugs: {stats['total_db']}")
    print(f"\n✓ Matched: {stats['matched']} ({stats['matched']/stats['total_sfda']*100:.1f}%)")
    print(f"  - High confidence (≥95%): {stats['high_confidence']}")
    print(f"  - Medium confidence (85-95%): {stats['medium_confidence']}")
    print(f"  - Low confidence (75-85%): {stats['low_confidence']}")
    print(f"\n✓ Price updates: {stats['updated']}")
    print(f"✗ No match found: {stats['no_match']} ({stats['no_match']/stats['total_sfda']*100:.1f}%)")
    
    # Save detailed report
    report_file = f"price_update_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'statistics': stats,
            'price_changes': stats['price_changes'][:100]  # First 100 changes
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 Detailed report saved: {report_file}")
    
    # Close connection
    cursor.close()
    conn.close()
    
    print("\n✅ Price update completed successfully!")
    return stats

if __name__ == "__main__":
    sfda_file = "/home/ubuntu/upload/sfda_drugs_full.xlsx"
    if not os.path.exists(sfda_file):
        print(f"❌ File not found: {sfda_file}")
        exit(1)
    
    update_prices(sfda_file)
