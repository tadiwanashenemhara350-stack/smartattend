import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
from pathlib import Path

def train():
    data_path = Path(__file__).resolve().parent / "training_data.csv"
    if not data_path.exists():
        print(f"Dataset not found at {data_path}. Please run prepare_dataset.py first.")
        return

    print("Loading data...")
    df = pd.read_csv(data_path)

    # Features and Target
    X = df[['total_classes', 'classes_attended', 'late_arrivals', 'attendance_ratio', 'late_ratio']]
    y = df['is_failed']

    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
    model.fit(X_train, y_train)

    print("Evaluating Model...")
    y_pred = model.predict(X_test)
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}\n")

    model_path = Path(__file__).resolve().parent / "attendance_model.joblib"
    joblib.dump(model, model_path)
    print(f"Model successfully saved to {model_path}")

if __name__ == '__main__':
    train()
