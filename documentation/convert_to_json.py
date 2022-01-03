import pandas as pd

df_dimensions = pd.read_csv('dimensions.tsv', sep='\t')
df_dimensions.to_json('dimensions.json', orient="records")

df_options = pd.read_csv('options.tsv', sep='\t')
df_options.to_json('options.json', orient="records")