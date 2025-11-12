import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin operations - add balance to users
    Args: event with httpMethod, body containing adminId, targetUserId, amount
    Returns: HTTP response with transaction result
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
        admin_id = body_data.get('adminId', '').strip()
        target_user_id = body_data.get('targetUserId', '').strip()
        amount = body_data.get('amount', 0)
        
        if not admin_id or not target_user_id or amount <= 0:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid parameters'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT is_admin FROM users WHERE id = %s", (admin_id,))
        admin = cursor.fetchone()
        
        if not admin or not admin['is_admin']:
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Admin access required'}),
                'isBase64Encoded': False
            }
        
        cursor.execute("SELECT id, username FROM users WHERE id = %s", (target_user_id,))
        target_user = cursor.fetchone()
        
        if not target_user:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User not found'}),
                'isBase64Encoded': False
            }
        
        cursor.execute(
            "UPDATE users SET balance = balance + %s WHERE id = %s",
            (amount, target_user_id)
        )
        
        cursor.execute(
            "INSERT INTO balance_transactions (user_id, admin_id, amount, transaction_type, description) VALUES (%s, %s, %s, %s, %s)",
            (target_user_id, admin_id, amount, 'admin_add', f'Admin added {amount} to balance')
        )
        
        conn.commit()
        
        cursor.execute("SELECT balance FROM users WHERE id = %s", (target_user_id,))
        updated_user = cursor.fetchone()
        
        result = {
            'success': True,
            'targetUserId': target_user_id,
            'targetUsername': target_user['username'],
            'amountAdded': float(amount),
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
