import json
import os
import random
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def play_upgrade(bet_amount: float) -> tuple[bool, float]:
    win = random.choice([True, False])
    return win, bet_amount * 2 if win else 0

def play_keno(bet_amount: float) -> tuple[bool, float]:
    numbers_hit = random.randint(0, 10)
    if numbers_hit >= 7:
        multiplier = 2 + (numbers_hit - 7) * 0.5
        return True, bet_amount * multiplier
    return False, 0

def play_case_battle(bet_amount: float) -> tuple[bool, float]:
    win_chance = random.randint(1, 100)
    if win_chance <= 30:
        multiplier = random.uniform(1.5, 3.0)
        return True, bet_amount * multiplier
    return False, 0

def play_roulette(bet_amount: float) -> tuple[bool, float]:
    win = random.choice([True, False])
    return win, bet_amount * 2 if win else 0

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Handle game logic and betting
    Args: event with httpMethod, body containing userId, gameType, betAmount
    Returns: HTTP response with game result
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('userId', '').strip()
        game_type = body_data.get('gameType', '').strip()
        bet_amount = float(body_data.get('betAmount', 0))
        
        if not user_id or not game_type or bet_amount <= 0:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid parameters'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        if float(user['balance']) < bet_amount:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Insufficient balance'}),
                'isBase64Encoded': False
            }
        
        game_functions = {
            'upgrade': play_upgrade,
            'keno': play_keno,
            'case-battle': play_case_battle,
            'roulette': play_roulette
        }
        
        if game_type not in game_functions:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid game type'}),
                'isBase64Encoded': False
            }
        
        won, win_amount = game_functions[game_type](bet_amount)
        
        balance_change = win_amount - bet_amount
        
        cursor.execute(
            "UPDATE users SET balance = balance + %s WHERE id = %s",
            (balance_change, user_id)
        )
        
        cursor.execute(
            "INSERT INTO games (user_id, game_type, bet_amount, win_amount, result) VALUES (%s, %s, %s, %s, %s)",
            (user_id, game_type, bet_amount, win_amount, 'win' if won else 'loss')
        )
        
        conn.commit()
        
        cursor.execute("SELECT balance FROM users WHERE id = %s", (user_id,))
        updated_user = cursor.fetchone()
        
        result = {
            'won': won,
            'betAmount': bet_amount,
            'winAmount': float(win_amount),
            'balanceChange': float(balance_change),
            'newBalance': float(updated_user['balance'])
        }
        
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
