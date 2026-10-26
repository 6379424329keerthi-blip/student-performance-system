import os
import json
import nbformat as nbf

nb = nbf.v4.new_notebook()

cells = [
    nbf.v4.new_markdown_cell(
        "# Smart Student Performance Prediction & Academic Risk Analytics\n"
        "## Exploratory Data Analysis & Early Warning Validation\n"
        "**Dataset:** UCI Student Performance Dataset (Cortez & Silva, 2008)\n"
        "**Target Variable:** `at_risk` (Binary Classification: $G3 < 10$ on statutory 0-20 scale)\n"
        "**Scope:** Preventing Academic Attrition using Mid-term Formative Evaluation ($G1$) without Data Leakage"
    ),
    nbf.v4.new_code_cell(
        "import os\n"
        "import pandas as pd\n"
        "import numpy as np\n"
        "import matplotlib.pyplot as plt\n"
        "import seaborn as sns\n\n"
        "sns.set_theme(style='whitegrid')\n"
        "plt.rcParams['figure.dpi'] = 150\n\n"
        "df = pd.read_csv('../data/processed/student_performance_cleaned.csv')\n"
        "print(f'Total records: {len(df):,}')\n"
        "print(f'Unique students: {df[\"student_id\"].nunique():,}')\n"
        "df.head(3)"
    ),
    nbf.v4.new_markdown_cell("### 1. Data Integrity and Target Class Distribution"),
    nbf.v4.new_code_cell(
        "print('Missing values audit: Total missing =', df.isnull().sum().sum())\n"
        "print('\\nTarget Class Breakdown:')\n"
        "print(df['at_risk'].value_counts())\n"
        "print('\\nTarget Class Ratio:')\n"
        "print(df['at_risk'].value_counts(normalize=True).apply(lambda x: f'{x:.2%}'))\n"
        "print('\\nCourse-specific At-Risk Rate:')\n"
        "print(df.groupby('course')['at_risk'].agg(['count', 'mean']).rename(columns={'mean': 'at_risk_rate'}))"
    ),
    nbf.v4.new_markdown_cell("### 2. Numerical Features Summary"),
    nbf.v4.new_code_cell(
        "num_cols = ['age', 'Medu', 'Fedu', 'traveltime', 'studytime', 'failures', 'absences', 'G1', 'G3']\n"
        "df[num_cols].describe().round(2)"
    ),
    nbf.v4.new_markdown_cell("### 3. Key Relationships with Academic Risk"),
    nbf.v4.new_code_cell(
        "fig, axes = plt.subplots(1, 2, figsize=(12, 4))\n"
        "sns.boxplot(x='at_risk', y='G1', data=df, ax=axes[0], palette=['#059669', '#dc2626'], hue='at_risk', legend=False)\n"
        "axes[0].set_xticks([0, 1])\n"
        "axes[0].set_xticklabels(['Satisfactory (0)', 'At Risk (1)'])\n"
        "axes[0].set_title('Mid-term Grade (G1) by At-Risk Outcome')\n\n"
        "fail_risk = df.groupby('failures')['at_risk'].mean() * 100\n"
        "axes[1].bar([str(i) for i in fail_risk.index], fail_risk.values, color='#dc2626', edgecolor='black')\n"
        "axes[1].set_title('At-Risk Rate (%) by Prior Past Failures')\n"
        "axes[1].set_ylabel('At Risk (%)')\n"
        "plt.tight_layout()\n"
        "plt.show()"
    )
]

nb["cells"] = cells
nb_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "notebooks", "exploratory_analysis.ipynb")
with open(nb_path, "w", encoding="utf-8") as f:
    nbf.write(nb, f)
print(f"Generated notebook at {nb_path}")
