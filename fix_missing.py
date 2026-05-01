import os
import re

file_path = "frontend/src/pages/AdminDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(400px, 600px)', gap: '2rem' }}>
                                            type="text" """

replacement = """                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(400px, 600px)', gap: '2rem' }}>
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution Name</label>
                                        <input 
                                            type="text" """

new_content = content.replace(target, replacement)

if new_content != content:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print("Target not found. Doing regex fallback...")
    
    # regex fallback
    target_pattern = r"(<div style={{ display: 'grid', gridTemplateColumns: isCompact \? '1fr' : 'minmax\(400px, 600px\)', gap: '2rem' }}>\s+)type=\"text\"\s+"
    
    if re.search(target_pattern, content):
        new_content = re.sub(target_pattern, r"\1<div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>\n                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>\n                                    <div>\n                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution Name</label>\n                                        <input \n                                            type=\"text\" \n                                            ", content)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Replaced via regex")
    else:
        print("Regex not matched either.")
