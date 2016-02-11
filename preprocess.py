# -*- coding: utf-8 -*-
import pandas as pd
from nltk.corpus import stopwords 
from nltk.util import ngrams
import re,nltk, numpy as np
from scipy.spatial.distance import cosine

clicks  =  pd.read_csv('class_click.csv',header=0,dtype=str)
#operations  =  pd.read_csv('class_operation.csv',header=0)
queries  =  pd.read_csv('class_query.csv',header=0)
selects  =  pd.read_csv('class_select.csv',header=0)


#operations['timestamp'] = operations['timestamp']/max(operations['timestamp'])
#user_groups = operations.groupby('u_id')
#timespent =  user_groups['timestamp'].max()- user_groups['timestamp'].min()
#timespent.reset_index().to_csv('timespendperuser.csv',index=False)
#query_groups = queries.groupby(['u_id','timestamp'])
#total = pd.merge(queries,operations,how='inner', on=['u_id','timestamp'])


findlastslash = re.compile(r'.*/(?:search\?q=)?(.*)')
replacePattern = re.compile(r'%20|[^0-9a-z]|\d|^\[.*\]$')
shortPattern =re.compile(r'\W*\b\w{1,3}\b')
longPattern = re.compile(r'\W*\b\w{20,}\b')
qaPattern = re.compile(r'[QA]:')
spacePattern = re.compile(r'  +')

stops = stopwords.words('english')

def queryFromURL(query):
    query = str(query).lower()    
    query = findlastslash.search(query)
    if query: query = query.groups()[0]
    if query: return spacePattern.sub(' ',shortPattern.sub(' ',replacePattern.sub(' ',query).strip()))
    return ''
    
def tokenize(query,n):
    query = queryFromURL(query)
    if query:
        words = nltk.word_tokenize(query)     
        if n==1:
            words_groups = [ w for w in words if not w in stops]
        else:
            words_groups = ngrams(words,n)
        return words_groups
  
def processCorpus(corpus, n,total_counts={}):
    word_counts={}                    
    for i in corpus:
        words = tokenize(str(i),n)
        if not words: continue
        for w in words:
            if n!=1:
                w = tuple(w)
            word_counts[w] = word_counts.get(w,0)+1
            if total_counts:
                total_counts[w] = total_counts.get(w,0)+1   
    
    return (word_counts, total_counts)
        
        
#manual tfid
def cosineSim(data,selectData):
    clicks_grouped = data.groupby('u_id')
    dictArray = []
    for i,group in clicks_grouped:       
        q,tot = processCorpus(group['url'].unique(),1)
        t,tot = processCorpus(group['target'].unique(),1,q.copy())
        try:
            t,final = processCorpus(selectData.get_group(i)['text'].unique(),1,tot.copy())
        except:
            final=tot
        dictArray.append(final)        
     
    df = pd.DataFrame(dictArray, index=clicks_grouped.groups.keys())
    
    df.fillna(0).reset_index().to_csv("wordcountsperuser.csv",index=None)
    
    df = df.fillna(0.00000000000001)
    
    cosineArray = []
    for i in range(len(df)):
        row = []
        for j in range(len(df)):
            try:
                if cosineArray[j][i]:
                    row.append(cosineArray[j][i])
            except:
                row.append(cosine(df.ix[i],df.ix[j]))
        cosineArray.append(row[:])
        
    return pd.DataFrame(cosineArray, index=clicks_grouped.groups.keys(),columns=clicks_grouped.groups.keys()).fillna(0)



            
#extract words from the query url since no logical connection from class_query to class_click or 
#class_select using merge on timestamp
#Remove rows with no target link in clicks
def simProcess(clicks):
    clicks = clicks[clicks['target']!='']
    clicks = clicks[clicks['target'].apply(lambda x:not re.search('^\[.*\]$',str(x)))]
    clicks['text'] = clicks['text'].apply(lambda x: re.sub('\\r','',x).strip())
    clicks = clicks[clicks['text']!='']    
    clicks['query'] = clicks['url'].apply(queryFromURL) 
    clicks['clicked'] = clicks['target'].apply(queryFromURL)
    clicks['text'] = clicks['text'].apply(lambda x:qaPattern.sub('',longPattern.sub('',x)))   
    
    wordcount_query = processCorpus(clicks['url'].unique(),1)
    wordcount_clicked, queryandclicked_counts = processCorpus(clicks['target'].unique(),1, wordcount_query[0].copy())
    #wordcount_text, total_counts = processCorpus(clicks['text'].unique(),1, queryandclicked_counts.copy())      
    
    pd.DataFrame([queryandclicked_counts.keys(), queryandclicked_counts.values()]).transpose().to_csv("wordCount.csv",index=None,header=['word','count'])  
    
    
    
selects_group = selects.groupby('u_id');    
cosineSim(clicks,selects_group).reset_index().to_csv("cosine_sim.csv",index=None)
simProcess(clicks)


#Can be used for recommendation
query_target_mappings={}
def mappings(x):
    if not re.search('^\[.*\]$|javascript:void|^nan$',str(x['target'])):
        query_tokens =[i for i in nltk.word_tokenize(queryFromURL(x['url']))]
    #target_tokens =[i for i in nltk.word_tokenize(queryFromURL(x['target'])) if i not in stops]    
        unigram = [ i for i in query_tokens if i not in stops]
        bigrams = ngrams(query_tokens,2)
        trigrams = ngrams(query_tokens,3)
        for i in unigram:        
            query_target_mappings[(i,x['target'])] = query_target_mappings.get((i,x['target']),0) +1
        for i in bigrams:        
            query_target_mappings[(i,x['target'])] = query_target_mappings.get((i,x['target']),0) +1
        for i in trigrams:        
            query_target_mappings[(i,x['target'])] = query_target_mappings.get((i,x['target']),0) +1

#for i in clicks.iterrows():
#    mappings(i[1])


