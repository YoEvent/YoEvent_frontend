const fs = require('fs');
const transcript = fs.readFileSync('transcript_results.txt', 'utf8');
const lines = transcript.split('\n');

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                    console.log(call.args.TargetFile);
                }
            }
        }
    } catch (e) {
    }
}
