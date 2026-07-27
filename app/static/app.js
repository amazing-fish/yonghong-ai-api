(async () => {
  const health = document.getElementById('health');
  const output = document.getElementById('output');
  try {
    const response = await fetch('/api/v1/health');
    health.textContent = JSON.stringify(await response.json());
  } catch (error) {
    health.textContent = error.message;
  }

  document.getElementById('send').onclick = async () => {
    output.textContent = '处理中……';
    try {
      const rows = JSON.parse(document.getElementById('rows').value);
      const response = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          question: document.getElementById('question').value,
          dashboard: '本地测试页',
          dataset_name: 'event_summary',
          filters: {},
          rows,
          history: []
        })
      });
      const accepted = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(accepted));
      while (true) {
        await new Promise(resolve => setTimeout(resolve, accepted.poll_interval_ms || 2000));
        const jobResponse = await fetch('/api/v1/jobs/' + encodeURIComponent(accepted.job_id));
        const job = await jobResponse.json();
        output.textContent = JSON.stringify(job, null, 2);
        if (job.status === 'succeeded' || job.status === 'failed') break;
      }
    } catch (error) {
      output.textContent = error.stack || error.message;
    }
  };
})();
