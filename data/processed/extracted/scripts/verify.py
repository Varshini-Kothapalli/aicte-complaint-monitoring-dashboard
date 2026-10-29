import sys, pandas as pd, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
W=sys.argv[1]; L=lambda n: pd.read_pickle(f"{W}/syn_{n}.pkl")
c,a,gt,inst,al,tr=L("cases"),L("case_actions"),L("overlap_ground_truth"),L("institutions"),L("institution_alias_tests"),L("transfers")
AS=pd.Timestamp("2026-10-31"); errs=[]
chk=lambda cond,msg: errs.append(msg) if not cond else None
chk(c.case_id.is_unique,"dup case ids"); chk((c.receipt_date<=AS).all(),"future receipt"); chk((a.ts<=AS+pd.Timedelta(days=1)).all(),"future action")
chk(((c.status=="Received")==(c.assigned_officer=="")).all(),"officer/status mismatch")
chk(set(gt.case_a)|set(gt.case_b)<=set(c.case_id),"gt refers missing case")
chk(set(c.institution_id[c.institution_id!=""])<=set(inst.institution_id),"unknown institution")
chk(inst.institution_id.is_unique and inst.aicte_permanent_id.is_unique,"inst ids not unique")
chk(c.groupby("case_id").size().eq(1).all(),"x")
first=a.groupby("case_id").ts.min(); chk((first.reindex(c.case_id).values>=c.receipt_date.values).all(),"action before receipt")
chk(all(x.startswith("SYN") for x in c.case_id),"non-SYN ids")
d=c[c.design_note.str.startswith("DEMO")]; print(d[["case_id","bureau","category","status","assigned_officer","expected_disposal_date"]].to_string())
print("ERRORS:",errs or "none")
# baseline: TF-IDF cosine on pairs
tf=TfidfVectorizer(stop_words="english",ngram_range=(1,2),min_df=1).fit(c.description)
V=dict(zip(c.case_id,tf.transform(c.description)))
gt["tfidf_cos"]=[float((V[x].multiply(V[y])).sum()) for x,y in zip(gt.case_a,gt.case_b)]
print(gt.groupby(["relation","shares_reference"]).tfidf_cos.describe()[["mean","min","50%","max"]].round(2))
cross=gt[gt.cross_bureau]
for th in [0.15,0.2,0.25,0.3]:
    p=cross.tfidf_cos>=th; y=cross.relation=="same_matter"
    tp=(p&y).sum(); print(f"tfidf>= {th}: precision {tp/max(p.sum(),1):.2f} recall {tp/y.sum():.2f}")
