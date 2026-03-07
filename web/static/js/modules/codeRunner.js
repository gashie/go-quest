export class CodeRunner {
    async run(code) {
        try {
            const resp = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            if (!resp.ok) {
                return { success: false, output: '', error: 'Server error: ' + resp.status };
            }

            const result = await resp.json();

            if (result.Errors) {
                return { success: false, output: '', error: result.Errors };
            }

            let stdout = '';
            let stderr = '';

            if (result.Events) {
                for (const event of result.Events) {
                    if (event.Kind === 'stdout') stdout += event.Message;
                    if (event.Kind === 'stderr') stderr += event.Message;
                }
            }

            return { success: true, output: stdout, error: stderr };
        } catch (err) {
            return { success: false, output: '', error: 'Network error: ' + err.message };
        }
    }
}
