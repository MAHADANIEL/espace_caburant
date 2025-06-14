from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import tempfile

app = Flask(__name__)
CORS(app) # Active CORS pour toutes les routes

# ******************************************************
# --- 1. CONFIGURATION ET INITIALISATION DE LA DB ---
# ******************************************************
DATABASE = os.path.join(tempfile.gettempdir(), 'database.db')


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cistern (
                id INTEGER PRIMARY KEY DEFAULT 1,
                current_litres REAL NOT NULL,
                max_capacity REAL NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS distribution_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                amount_distributed REAL NOT NULL,
                old_level REAL NOT NULL,
                new_level REAL NOT NULL,
                type TEXT NOT NULL
            )
        ''')

        cursor.execute('SELECT COUNT(*) FROM cistern WHERE id = 1')
        if cursor.fetchone()[0] == 0:
            cursor.execute('INSERT INTO cistern (id, current_litres, max_capacity) VALUES (1, ?, ?)', (0.0, 0.0))
            conn.commit()
            print("Citerne initiale créée.")
        else:
            print("Citerne déjà existante.")
        conn.close()

# APPEL DE LA FONCTION init_db() ICI, EN DEHORS DU BLOC if __name__ == '__main__':
# Cela garantit qu'elle est toujours exécutée au démarrage de l'application,
# que ce soit via 'python app.py' ou 'gunicorn app:app'.
init_db()


# ******************************************************
# --- 2. ROUTES DE L'API ---
# ******************************************************

@app.route('/api/fuel', methods=['GET'])
def get_fuel():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT current_litres, max_capacity FROM cistern WHERE id = 1')
    cistern_data = cursor.fetchone()
    conn.close()

    if cistern_data:
        return jsonify({
            'litresRestant': round(cistern_data['current_litres'], 2),
            'maxCapacity': round(cistern_data['max_capacity'], 2)
        })
    return jsonify({'message': 'Cistern non trouvée.'}), 404

@app.route('/api/distribution_history', methods=['GET'])
def get_distribution_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT timestamp, amount_distributed, old_level, new_level, type FROM distribution_history ORDER BY timestamp DESC')
    history_data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'history': history_data})

@app.route('/api/fuel/set_initial', methods=['POST'])
def set_initial_fuel():
    data = request.get_json()
    initial_capacity = data.get('capacity')

    if initial_capacity is None:
        return jsonify({'message': 'Champ "capacity" manquant.'}), 400

    try:
        initial_capacity = float(initial_capacity)
        if initial_capacity <= 0:
            return jsonify({'message': 'Capacité invalide.'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE cistern SET current_litres = ?, max_capacity = ? WHERE id = 1',
                       (initial_capacity, initial_capacity))
        conn.commit()
        conn.close()

        return jsonify({
            'message': f'Capacité définie à {initial_capacity:.2f} L',
            'litresRestant': round(initial_capacity, 2),
            'maxCapacity': round(initial_capacity, 2)
        }), 200
    except ValueError:
        return jsonify({'message': 'Valeur non valide.'}), 400
    except Exception as e:
        return jsonify({'message': f'Erreur: {str(e)}'}), 500

# NOUVELLE ROUTE : Pour l'ajout manuel de carburant depuis le frontend
@app.route('/api/fuel/add', methods=['POST'])
def add_manual_fuel():
    data = request.get_json()
    amount_to_add = data.get('amount')

    if amount_to_add is None:
        return jsonify({'message': 'Champ "amount" manquant.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT current_litres, max_capacity FROM cistern WHERE id = 1')
    cistern_data = cursor.fetchone()

    if not cistern_data:
        conn.close()
        return jsonify({'message': 'Citerne non trouvée. Définissez la capacité maximale d\'abord.'}), 404

    current_litres_db = cistern_data['current_litres']
    max_capacity_db = cistern_data['max_capacity']

    if max_capacity_db <= 0:
        conn.close()
        return jsonify({'message': 'Capacité maximale non définie.'}), 400

    try:
        amount_to_add = float(amount_to_add)
        if amount_to_add <= 0:
            conn.close()
            return jsonify({'message': 'Quantité positive requise pour l\'ajout.'}), 400

        old_level = current_litres_db
        new_level = min(old_level + amount_to_add, max_capacity_db) # Ne pas dépasser la capacité max

        if new_level > old_level: # S'assurer qu'il y a eu un ajout effectif
            cursor.execute('UPDATE cistern SET current_litres = ? WHERE id = 1', (new_level,))

            amount_actual_added = new_level - old_level
            timestamp_str = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO distribution_history (timestamp, amount_distributed, old_level, new_level, type)
                VALUES (?, ?, ?, ?, ?)
            ''', (timestamp_str, amount_actual_added, old_level, new_level, 'manual_addition'))
            print(f"Ajout manuel enregistré : {amount_actual_added:.2f} L")
            message = f'{amount_actual_added:.2f} L ajoutés.'
        else:
            message = 'Réservoir déjà plein ou aucune quantité ajoutée car la capacité maximale serait dépassée.'
            
        conn.commit()
        conn.close()

        return jsonify({
            'message': message,
            'litresRestant': round(new_level, 2),
            'maxCapacity': round(max_capacity_db, 2)
        }), 200

    except ValueError:
        conn.close()
        return jsonify({'message': 'Valeur de quantité invalide.'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'message': f'Erreur serveur lors de l\'ajout manuel: {str(e)}'}), 500


@app.route('/api/fuel/update_from_hardware', methods=['POST'])
def update_from_hardware():
    data = request.get_json()
    new_litres = data.get('litres')

    if new_litres is None:
        return jsonify({'message': 'Champ "litres" manquant.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT current_litres, max_capacity FROM cistern WHERE id = 1')
    cistern_data = cursor.fetchone()

    if not cistern_data:
        conn.close()
        return jsonify({'message': 'Cistern non trouvée.'}), 404

    current_litres_db = cistern_data['current_litres']
    max_capacity_db = cistern_data['max_capacity']

    if max_capacity_db <= 0:
        conn.close()
        return jsonify({'message': 'Capacité non définie.'}), 400

    try:
        new_litres = float(new_litres)
        new_litres = min(max(new_litres, 0), max_capacity_db)

        old_level = current_litres_db
        cursor.execute('UPDATE cistern SET current_litres = ? WHERE id = 1', (new_litres,))

        if new_litres < old_level:
            amount_distributed = old_level - new_litres
            if amount_distributed > 0.01:
                timestamp_str = datetime.now().isoformat()
                cursor.execute('''
                    INSERT INTO distribution_history (timestamp, amount_distributed, old_level, new_level, type)
                    VALUES (?, ?, ?, ?, ?)
                ''', (timestamp_str, amount_distributed, old_level, new_litres, 'hardware_consumption'))
                print(f"Consommation enregistrée : {amount_distributed:.2f} L (hardware)")

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Niveau mis à jour par le matériel.',
            'litresRestant': round(new_litres, 2),
            'maxCapacity': round(max_capacity_db, 2)
        }), 200
    except ValueError:
        conn.close()
        return jsonify({'message': 'Valeur invalide.'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'message': f'Erreur serveur: {str(e)}'}), 500

@app.route('/api/fuel/consume', methods=['POST'])
def consume_fuel():
    data = request.get_json()
    amount_to_consume = data.get('amount')

    if amount_to_consume is None:
        return jsonify({'message': 'Champ "amount" manquant.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT current_litres, max_capacity FROM cistern WHERE id = 1')
    cistern_data = cursor.fetchone()

    if not cistern_data:
        conn.close()
        return jsonify({'message': 'Cistern non trouvée.'}), 404

    current_litres_db = cistern_data['current_litres']
    max_capacity_db = cistern_data['max_capacity']

    if max_capacity_db <= 0:
        conn.close()
        return jsonify({'message': 'Capacité non définie.'}), 400

    try:
        amount_to_consume = float(amount_to_consume)
        if amount_to_consume < 0:
            conn.close()
            return jsonify({'message': 'Quantité négative non autorisée.'}), 400

        old_level = current_litres_db
        new_level = max(old_level - amount_to_consume, 0.0)

        if new_level == 0 and old_level > 0: # Si on atteint zéro et qu'il y avait du carburant
            message = 'Réservoir vide !'
        elif new_level < old_level: # Si le niveau a réellement diminué
            message = f'{amount_to_consume:.2f} L consommés.'
        else: # Si rien n'a été consommé (ex: demande 0, ou déjà vide)
            message = 'Aucune consommation enregistrée.'


        cursor.execute('UPDATE cistern SET current_litres = ? WHERE id = 1', (new_level,))

        amount_actual_consumed = old_level - new_level
        if amount_actual_consumed > 0.01: # Enregistrer si la quantité consommée est significative
            timestamp_str = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO distribution_history (timestamp, amount_distributed, old_level, new_level, type)
                VALUES (?, ?, ?, ?, ?)
            ''', (timestamp_str, amount_actual_consumed, old_level, new_level, 'manual_consumption'))
            print(f"Consommation manuelle: {amount_actual_consumed:.2f} L")

        conn.commit()
        conn.close()

        return jsonify({
            'message': message,
            'litresRestant': round(new_level, 2),
            'maxCapacity': round(max_capacity_db, 2)
        }), 200

    except ValueError:
        conn.close()
        return jsonify({'message': 'Valeur invalide.'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'message': f'Erreur serveur: {str(e)}'}), 500

# ******************************************************
# --- Routes pour servir les pages front-end ---
# ******************************************************

@app.route('/')
def login():
    return render_template('login.html')

@app.route('/login')
def go_to_login():
    return render_template('login.html')

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/historique')
def historique():
    return render_template('historique.html')


# ******************************************************
# --- 3. LANCEMENT DE L'APPLICATION ---
# ******************************************************
if __name__ == '__main__':
    # Cette ligne n'est plus strictement nécessaire ici car init_db() est appelée plus haut
    # Mais la laisser ne fera pas de mal, elle sera juste appelée une deuxième fois si
    # le script est exécuté directement. Pour Gunicorn, elle ne sera pas appelée du tout.
    # init_db()
    import os
    port = int(os.environ.get('PORT', 5000)) # Render définit cette variable automatiquement
    app.run(host='0.0.0.0', port=port, debug=False)