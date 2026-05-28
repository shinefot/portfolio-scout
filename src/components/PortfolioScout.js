import React, { useState } from 'react';
import Papa from 'papaparse';
import axios from 'axios';

const STRATEGIC_PILLARS = [
  'People-led Technology',
  'AI & Machine Learning',
  'Cloud Infrastructure',
  'Customer Experience',
  'Supply Chain & Operations',
  'Data & Analytics'
];

const SAMPLE_DATA = `Initiative,Category,AnnualSpend,Headcount,StrategicPillar,Status,Owner,LastReview
AI-Powered Search,AI/ML,4200000,12,AI & Machine Learning,Active,Platform Team,2025-Q1
Legacy POS Modernization,Infrastructure,8500000,24,Customer Experience,At Risk,Retail Tech,2024-Q2
Cloud Data Lake,Data,3100000,8,Data & Analytics,Active,Data Platform,2025-Q1
Autonomous Inventory,AI/ML,6700000,18,AI & Machine Learning,Active,Supply Chain Tech,2025-Q1
Employee Scheduling Tool,HCM,1200000,4,People-led Technology,Stalled,HR Tech,2023-Q4
Blockchain Supply Chain,Experimental,2800000,9,Supply Chain & Operations,Stalled,Innovation Lab,2023-Q2
Real-time Pricing Engine,ML,3900000,11,Customer Experience,Active,Pricing Team,2025-Q1
Legacy Reporting Suite,BI,1800000,6,Data & Analytics,At Risk,Finance Tech,2024-Q1
Voice Commerce Platform,AI/ML,2200000,7,Customer Experience,Stalled,Digital Team,2023-Q3
Kubernetes Migration,Infrastructure,4100000,14,Cloud Infrastructure,Active,Platform Team,2025-Q1
Associate Learning Platform,HCM,900000,3,People-led Technology,Active,HR Tech,2024-Q3
Data Governance Framework,Data,1500000,5,Data & Analytics,Active,Data Platform,2025-Q1
AR Store Navigation,Experimental,3300000,11,Customer Experience,Stalled,Innovation Lab,2023-Q1
Fraud Detection ML,ML,2700000,8,AI & Machine Learning,Active,Risk Tech,2025-Q1
Legacy CRM Migration,CRM,5200000,16,Customer Experience,At Risk,CRM Team,2024-Q2`;

export default function PortfolioScout() {
  const [csvData, setCsvData] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [pillars, setPillars] = useState(STRATEGIC_PILLARS);
  const [newPillar, setNewPillar] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const TABS = ['Portfolio Overview', 'Alignment Scores', 'Zombie Detection', 'Recommendations'];

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => { setCsvData(results.data); setError(''); setResult(null); },
      error: () => setError('Failed to parse CSV.')
    });
  };

  const loadSample = () => {
    const results = Papa.parse(SAMPLE_DATA, { header: true, skipEmptyLines: true });
    setCsvData(results.data);
    setCsvFileName('sample-portfolio.csv');
    setResult(null);
    setError('');
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

  const addPillar = () => {
    if (newPillar.trim() && !pillars.includes(newPillar.trim())) {
      setPillars([...pillars, newPillar.trim()]);
      setNewPillar('');
    }
  };

  const removePillar = (p) => setPillars(pillars.filter(x => x !== p));

  const runAnalysis = async () => {
    if (!csvData) { setError('Please upload a CSV file first.'); return; }
    setError(''); setLoading(true); setResult(null);

    const prompt = `You are a Senior Technology Portfolio Advisor. Analyze this technology portfolio and return a JSON object only — no markdown, no preamble.

STRATEGIC PILLARS (current organizational priorities):
${pillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}

PORTFOLIO DATA (${csvData.length} initiatives):
${JSON.stringify(csvData, null, 2)}

Analyze every initiative and return this exact JSON:
{
  "portfolioSummary": {
    "totalInitiatives": ${csvData.length},
    "totalAnnualSpend": "$XM",
    "totalHeadcount": X,
    "alignedCount": X,
    "atRiskCount": X,
    "zombieCount": X,
    "healthScore": X,
    "headline": "2-3 sentence executive summary of portfolio health"
  },
  "alignmentScores": [
    {
      "initiative": "Initiative name",
      "category": "Category",
      "annualSpend": "$XM",
      "headcount": X,
      "pillar": "Closest strategic pillar",
      "alignmentScore": 85,
      "alignmentRating": "Strong|Moderate|Weak|None",
      "rationale": "One sentence explaining the score",
      "recommendation": "Keep|Watch|Review|Cut"
    }
  ],
  "zombies": [
    {
      "initiative": "Initiative name",
      "annualSpend": "$XM",
      "headcount": X,
      "lastReview": "Date or quarter",
      "severity": "Critical|High|Medium",
      "reason": "Why this qualifies as a zombie project",
      "estimatedSavings": "$XM if cut",
      "recommendedAction": "Pause|Cut|Redirect|Merge"
    }
  ],
  "recommendations": [
    {"priority": 1, "action": "Specific action", "impact": "$XM savings or value", "rationale": "Why this is the top priority"},
    {"priority": 2, "action": "Specific action", "impact": "$XM savings or value", "rationale": "Why"},
    {"priority": 3, "action": "Specific action", "impact": "$XM savings or value", "rationale": "Why"},
    {"priority": 4, "action": "Specific action", "impact": "$XM savings or value", "rationale": "Why"},
    {"priority": 5, "action": "Specific action", "impact": "$XM savings or value", "rationale": "Why"}
  ]
}

Be specific with dollar amounts. Use the actual data. Alignment score is 0-100. A zombie project has high spend + low alignment + stalled status + old last review date.`;

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: 'claude-sonnet-4-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          }
        }
      );
      const text = response.data.content.map(i => i.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      setResult(JSON.parse(clean));
      setActiveTab(0);
    } catch (err) {
      setError('Analysis failed. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const alignmentColor = { Strong: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }, Moderate: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' }, Weak: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }, None: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' } };
  const recColor = { Keep: '#16a34a', Watch: '#d97706', Review: '#dc2626', Cut: '#7f1d1d' };
  const severityStyle = { Critical: { bg: '#fef2f2', color: '#991b1b' }, High: { bg: '#fffbeb', color: '#92400e' }, Medium: { bg: '#f0fdf4', color: '#166534' } };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ backgroundColor: '#1e3a5f', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>Portfolio Scout</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>Technology Portfolio Rationalization</div>
        </div>
        {result && (
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'Total Spend', value: result.portfolioSummary.totalAnnualSpend },
              { label: 'Health Score', value: `${result.portfolioSummary.healthScore}/100` },
              { label: 'Zombies Found', value: result.zombies.length }
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{m.label}</div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Portfolio data</div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('csv-input').click()}
              style={{ border: `2px dashed ${dragging ? '#1e3a5f' : '#e5e7eb'}`, borderRadius: '8px', padding: '24px', textAlign: 'center', background: dragging ? '#f0f4f8' : '#f9fafb', cursor: 'pointer', marginBottom: '12px' }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📂</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{csvFileName || 'Drop CSV or click to browse'}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Initiative name, spend, headcount, pillar, status</div>
              <input id="csv-input" type="file" accept=".csv" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} />
            </div>
            <button onClick={loadSample} style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#666', marginBottom: '8px' }}>
              Load sample portfolio (15 initiatives) →
            </button>
            {csvData && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#166534' }}>
                ✓ {csvFileName} — {csvData.length} initiatives loaded
              </div>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Strategic pillars</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {pillars.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f4f8', border: '1px solid #dde3ea', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: '#1e3a5f' }}>
                  {p}
                  <span onClick={() => removePillar(p)} style={{ cursor: 'pointer', color: '#999', marginLeft: '2px', fontSize: '14px', lineHeight: 1 }}>×</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newPillar} onChange={(e) => setNewPillar(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPillar()} placeholder="Add custom pillar..." style={{ flex: 1, padding: '7px 10px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', outline: 'none' }} />
              <button onClick={addPillar} style={{ padding: '7px 14px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#333' }}>Add</button>
            </div>
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        <button onClick={runAnalysis} disabled={loading || !csvData} style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: loading || !csvData ? 'not-allowed' : 'pointer', borderRadius: '8px', background: loading || !csvData ? '#e5e7eb' : '#1e3a5f', color: loading || !csvData ? '#999' : 'white', border: 'none', marginBottom: '32px' }}>
          {loading ? 'Scanning portfolio...' : 'Run portfolio analysis →'}
        </button>

        {result && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
              {TABS.map((t, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ fontSize: '13px', padding: '8px 16px', cursor: 'pointer', color: activeTab === i ? '#1e3a5f' : '#666', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: activeTab === i ? '2px solid #1e3a5f' : '2px solid transparent', background: 'none', fontWeight: activeTab === i ? '600' : '400' }}>{t}</button>
              ))}
            </div>

            {activeTab === 0 && (
              <div>
                <p style={{ fontSize: '14px', lineHeight: '1.75', color: '#333', marginBottom: '24px' }}>{result.portfolioSummary.headline}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total annual spend', value: result.portfolioSummary.totalAnnualSpend },
                    { label: 'Total headcount', value: result.portfolioSummary.totalHeadcount },
                    { label: 'Aligned initiatives', value: result.portfolioSummary.alignedCount },
                    { label: 'Zombie projects', value: result.portfolioSummary.zombieCount, highlight: true }
                  ].map((m, i) => (
                    <div key={i} style={{ background: m.highlight ? '#fef2f2' : '#f8f9fa', borderRadius: '8px', padding: '14px', border: m.highlight ? '1px solid #fecaca' : 'none' }}>
                      <div style={{ fontSize: '11px', color: m.highlight ? '#991b1b' : '#888', marginBottom: '4px' }}>{m.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: m.highlight ? '#991b1b' : '#111' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>{['Initiative', 'Spend', 'HC', 'Pillar', 'Score', 'Rating', 'Action'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', color: '#888', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {result.alignmentScores.sort((a, b) => a.alignmentScore - b.alignmentScore).map((s, i) => (
                      <tr key={i}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ fontWeight: '500' }}>{s.initiative}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{s.rationale}</div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{s.annualSpend}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{s.headcount}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', color: '#555' }}>{s.pillar}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '40px', height: '4px', background: '#f3f4f6', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${s.alignmentScore}%`, height: '100%', background: s.alignmentScore > 70 ? '#16a34a' : s.alignmentScore > 40 ? '#d97706' : '#dc2626', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{s.alignmentScore}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', background: alignmentColor[s.alignmentRating]?.bg, color: alignmentColor[s.alignmentRating]?.color, border: `1px solid ${alignmentColor[s.alignmentRating]?.border}` }}>{s.alignmentRating}</span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: recColor[s.recommendation] }}>{s.recommendation}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 2 && (
              <div>
                {result.zombies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '14px' }}>No zombie projects detected — portfolio looks healthy.</div>
                ) : (
                  result.zombies.map((z, i) => (
                    <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', ...severityStyle[z.severity] }}>{z.severity}</span>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>{z.initiative}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>{z.annualSpend}/yr</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{z.headcount} HC · Last review: {z.lastReview}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', color: '#555', marginBottom: '10px', lineHeight: '1.6' }}>{z.reason}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', borderRadius: '6px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '13px', color: '#333' }}><span style={{ fontWeight: '600' }}>Recommended action: </span>{z.recommendedAction}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>Potential savings: {z.estimatedSavings}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 3 && (
              <div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0, color: 'white' }}>{r.priority}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>{r.action}</div>
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>{r.rationale}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>{r.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}