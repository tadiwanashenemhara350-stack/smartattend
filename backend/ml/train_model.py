import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score, make_scorer, recall_score
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
    X = df[['total_classes', 'classes_attended', 'late_arrivals', 'attendance_ratio', 'late_ratio', 'morning_absences', 'consecutive_absences']]
    y = df['is_failed']

    print("Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
    
    # Cross-validation for Recall
    print("Performing 5-Fold Cross-Validation (optimized for Recall)...")
    recall_scorer = make_scorer(recall_score)
    cv_scores = cross_val_score(model, X, y, cv=5, scoring=recall_scorer)
    print(f"Cross-Validated Recall Scores: {cv_scores}")
    print(f"Average CV Recall: {cv_scores.mean():.2f}")

    model.fit(X_train, y_train)

    print("Evaluating Model on Test Set...")
    y_pred = model.predict(X_test)
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}\n")

    # Display Feature Importances
    feature_importances = pd.DataFrame(model.feature_importances_,
                                       index = X_train.columns,
                                       columns=['importance']).sort_values('importance', ascending=False)
    print("--- Feature Importances ---")
    print(feature_importances)

    model_path = Path(__file__).resolve().parent / "attendance_model.joblib"
    joblib.dump(model, model_path)
    print(f"\nModel successfully saved to {model_path}")

if __name__ == '__main__':
    train()
