import pandas as pd

# Excelファイルのパス（適宜変更してください）
excel_path = "R7.5ninkashuusei.xlsx"  
json_output_path = "nursery_vacancies_from_excel.json"

# Excelからデータ読み込み（該当シートを指定）
df_raw = pd.read_excel(excel_path, sheet_name="Table 1")

# 年齢列が数値でない場合を考慮し、強制的に数値型へ変換（誤字や空白も処理）
for col in ["０歳", "１歳", "２歳", "３歳", "４歳", "５歳"]:
    df_raw[col] = pd.to_numeric(df_raw[col], errors="coerce")

# 必要な列だけ抽出し、列名を英語に変換
df_json = df_raw[["保育所", "開始", "０歳", "１歳", "２歳", "３歳", "４歳", "５歳", "所在地"]].copy()
df_json.columns = ["name", "start", "age_0", "age_1", "age_2", "age_3", "age_4", "age_5", "address"]

# 欠損値処理：空欄は "0" または "-" に変換
for col in ["age_0", "age_1", "age_2", "age_3", "age_4", "age_5"]:
    df_json[col] = df_json[col].fillna(0).astype(int)
df_json["address"] = df_json["address"].fillna("-")

# JSON形式で保存（日本語もそのまま、整形付き）
df_json.to_json(json_output_path, orient="records", force_ascii=False, indent=2)

print(f"✅ JSONファイルを出力しました: {json_output_path}")
