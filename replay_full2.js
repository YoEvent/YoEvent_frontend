const fs = require('fs');

const transcriptPath = "C:/Users/VICTUS/.gemini/antigravity-ide/brain/45d9af4e-2a38-4d6e-8e84-818a00d1775d/.system_generated/logs/transcript_full.jsonl";
const transcript = fs.readFileSync(transcriptPath, 'utf8');
const lines = transcript.split('\n');

let fileContent = fs.readFileSync('app/admin/events/page.tsx', 'utf8').replace(/\r\n/g, '\n');
let successCount = 0;
let failCount = 0;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                    if (call.args.TargetFile && call.args.TargetFile.replace(/\\/g, '/').includes('app/admin/events/page.tsx')) {
                        let chunks = [];
                        if (call.name === 'replace_file_content') {
                            chunks = [{
                                TargetContent: call.args.TargetContent,
                                ReplacementContent: call.args.ReplacementContent
                            }];
                        } else {
                            chunks = call.args.ReplacementChunks;
                            if (typeof chunks === 'string') chunks = JSON.parse(chunks);
                        }

                        for (const chunk of chunks) {
                            let target = chunk.TargetContent.replace(/\r\n/g, '\n');
                            let replacement = chunk.ReplacementContent.replace(/\r\n/g, '\n');
                            
                            if (fileContent.includes(target)) {
                                fileContent = fileContent.replace(target, replacement);
                                successCount++;
                            } else {
                                failCount++;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
    }
}

fs.writeFileSync('app/admin/events/page.tsx', fileContent);
console.log(`Replayed edits directly from full transcript. Success: ${successCount}, Failed: ${failCount}`);
