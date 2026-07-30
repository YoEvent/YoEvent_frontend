const fs = require('fs');

const transcript = fs.readFileSync('transcript_results.txt', 'utf8');
const lines = transcript.split('\n');

let fileContent = fs.readFileSync('app/admin/events/page.tsx', 'utf8');
let successCount = 0;
let failCount = 0;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                    if (call.args.TargetFile && call.args.TargetFile.includes('app\\admin\\events\\page.tsx') || call.args.TargetFile.includes('app/admin/events/page.tsx')) {
                        let chunks = [];
                        if (call.name === 'replace_file_content') {
                            chunks = [{
                                TargetContent: call.args.TargetContent,
                                ReplacementContent: call.args.ReplacementContent
                            }];
                        } else {
                            chunks = JSON.parse(call.args.ReplacementChunks);
                        }

                        for (const chunk of chunks) {
                            if (fileContent.includes(chunk.TargetContent)) {
                                fileContent = fileContent.replace(chunk.TargetContent, chunk.ReplacementContent);
                                successCount++;
                            } else {
                                console.log("Failed to match chunk:", chunk.TargetContent.substring(0, 50));
                                failCount++;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        // ignore JSON parse errors
    }
}

fs.writeFileSync('app/admin/events/page.tsx.recovered', fileContent);
console.log(`Replayed edits. Success: ${successCount}, Failed: ${failCount}`);
