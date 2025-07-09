import React, { useEffect, useRef } from 'react';
import Chart from '../../chart.js'; // Import Chart.js

interface WatchTimeChartProps {
  // No props needed for now, data will be fetched internally
}

const WatchTimeChart: React.FC<WatchTimeChartProps> = () => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<ChartInstance | null>(null); // To store the chart instance

  useEffect(() => {
    const renderChart = async () => {
      if (!chartRef.current) return;

      const result = await browser.storage.local.get('dailyWatchTime');
      const dailyWatchTime = result.dailyWatchTime || {};
      const labels: string[] = [];
      const data: number[] = [];

      // Prepare data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().slice(0, 10);
        
        const label = d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        // Convert ms to minutes for display
        const timeInMinutes = Math.round((dailyWatchTime[dateString] || 0) / 60000);
        data.push(timeInMinutes);
      }

      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Render the chart
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Minutes Vues',
              data: data,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value: number) { return value + ' min'; }
                }
              }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
          }
        });
      }
    };

    renderChart();

    // Listen for storage changes to re-render the chart
    const listener = (changes: any, area: string) => {
      if (area === 'local' && changes.dailyWatchTime) {
        renderChart();
      }
    };
    browser.storage.onChanged.addListener(listener);

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      browser.storage.onChanged.removeListener(listener);
    };
  }, []); // Empty dependency array means this runs once on mount

  return <canvas ref={chartRef}></canvas>;
};

export default WatchTimeChart;