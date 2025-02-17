"use client";

import React, { useEffect, useState } from "react";
import { Chart } from "chart.js/auto";
import { FaSync, FaRobot } from "react-icons/fa";
import FileTransferEstimator from "./components/calculator";

type Result = {
  [key: string]: string | number;
};

type HistoryEntry = {
  timestamp: string;
  ping: number;
  download: number;
  upload: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend.themsovietbois.com:3001/";

const NetworkTestApp: React.FC = () => {
  const [results, setResults] = useState<Result>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [chart, setChart] = useState<Chart | null>(null);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);

  const openEstimator = () => setIsEstimatorOpen(true);
  const closeEstimator = () => setIsEstimatorOpen(false);

  const fetchData = async () => {
    setLoading(true);
    setResults({
      ip: "Fetching...",
      ping: "Testing...",
      download: "Testing...",
      upload: "Testing...",
      nmap: "Scanning...",
      ports: "Scanning...",
      services: "Detecting...",
      vuln: "Scanning...",
      ssl: "Checking...",
      firewall: "Checking...",
    });

    const fetchTest = async (endpoint: string, key: string, retries: number = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(API_URL + endpoint);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          setResults((prev) => ({ ...prev, [key]: data[key] || `Error: ${data.error}` }));
          return;
        } catch (error) {
          if (i === retries - 1) {
            setResults((prev) => ({ ...prev, [key]: `Request failed: ${(error as Error).message}` }));
          }
        }
      }
    };

    await fetchTest("ip", "ip");
    const startTime = typeof window !== "undefined" ? Date.now() : 0;
    await fetchTest("ping", "ping");
    setResults((prev) => ({ ...prev, ping: `${Date.now() - startTime}ms` }));

    const downloadStart = Date.now();
    const downloadResponse = await fetch(API_URL + "download");
    const reader = downloadResponse.body?.getReader();
    if (!reader) throw new Error("Failed to read download stream");
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      setProgress((receivedLength / Number(downloadResponse.headers.get("content-length"))) * 100);
    }
    const blob = new Blob(chunks);
    const downloadSpeed = (blob.size / ((Date.now() - downloadStart) / 1000)) / 1024 / 1024;
    setResults((prev) => ({ ...prev, download: `Download Speed: ${downloadSpeed.toFixed(2)} MB/s` }));

    let uploadSpeed = 0;
    const formData = new FormData();
    formData.append("file", new File([blob], "downloaded_test_file", { type: blob.type }));

    try {
      const uploadStart = Date.now();

      const uploadResponse = await fetch(API_URL + "upload", {
        method: "POST",
        body: formData,
        headers: {
          "x-start-time": uploadStart.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();

      const uploadTime = uploadData.uploadTime || Date.now() - uploadStart;
      uploadSpeed = (blob.size / (uploadTime / 1000)) / 1024 / 1024;

      setResults((prev) => ({ ...prev, upload: `Upload Speed: ${uploadSpeed.toFixed(2)} MB/s` }));
    } catch (error) {
      console.error("Upload error:", error);
      setResults((prev) => ({ ...prev, upload: `Upload failed: ${(error as Error).message}` }));
    }

    await Promise.all([
      fetchTest("nmap", "nmap"),
      fetchTest("open-ports", "ports"),
      fetchTest("services", "services"),
      fetchTest("vuln-scan", "vuln"),
      fetchTest("ssl-check", "ssl"),
      fetchTest("firewall-check", "firewall"),
    ]);

    setHistory((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString("en-US"),
        ping: parseFloat(results.ping as string),
        download: parseFloat(downloadSpeed.toFixed(2)),
        upload: parseFloat(uploadSpeed.toFixed(2)),
      },
    ]);

    setLoading(false);
  };


  useEffect(() => {
    if (typeof window !== "undefined" && history.length > 0) {
      const ctx = document.getElementById("historyChart") as HTMLCanvasElement | null;
      if (!ctx) return;

      if (chart) chart.destroy();

      const newChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: history.map((entry) => entry.timestamp),
          datasets: [
            {
              label: "Ping (ms)",
              data: history.map((entry) => entry.ping),
              borderColor: "rgba(255, 99, 132, 1)",
              fill: false,
            },
            {
              label: "Download Speed (MB/s)",
              data: history.map((entry) => entry.download),
              borderColor: "rgba(54, 162, 235, 1)",
              fill: false,
            },
            {
              label: "Upload Speed (MB/s)",
              data: history.map((entry) => entry.upload),
              borderColor: "rgba(75, 192, 192, 1)",
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: "#ffffff",
              },
            },
            x: {
              ticks: {
                color: "#ffffff",
              },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: "#ffffff",
              },
            },
          },
        },
      });


      setChart(newChart);
    }
  }, [history]);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#110e24] text-white p-8 flex flex-col items-center">
      <button
        className="fixed bottom-8 right-8 bg-[#00cada] text-white p-4 rounded-full shadow-lg hover:bg-[#0099a8] transition-colors"
        aria-label="Chatbot"
      >
        <FaRobot className="text-2xl text-white" />
      </button>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6 col-span-3">
          <h1 className="text-3xl font-bold text-white">Network Traffic Dashboard</h1>
          <div className="flex flex-row mt-3 ">
            <button
              onClick={fetchData}
              className="flex items-center bg-[#00cada] text-white px-4 py-2 rounded-lg hover:bg-[#0099a8] transition-colors"
            >
              <FaSync className={`mr-2 text-white ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">IP Address</h2>
          <p className="text-white mt-1 text-7xl flex justify-center items-center w-full">{results.ip.toString().replace(/^::ffff:/, '')}</p>
        </div>


        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Ping</h2>
          <p className="text-white mt-1">{results.ping}</p>
          <div className="w-full h-2 bg-[#69639c] rounded-lg mt-2 overflow-hidden">
            <div
              className="h-2 rounded-lg"
              style={{
                width: `${Math.min(100, parseFloat(results.ping as string) / 5)}%`,
                backgroundColor: `rgb(${Math.min(255, (parseFloat(results.ping as string) / 2) * 5)}, 0, ${Math.max(
                  0,
                  255 - (parseFloat(results.ping as string) / 2) * 5
                )})`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Network Speed</h2>
          <div className="flex justify-between">
            <p className="text-white mt-1">{results.download}</p>
            <p className="text-white mt-1">{results.upload}</p>
          </div>
          <progress value={progress} max="100" className="w-full mt-2"></progress>
          <button
            onClick={openEstimator}
            className="mt-4 px-4 py-2 bg-[#00cada] text-white rounded-lg hover:bg-[#0099a8]"
          >
            Advanced File Speed Calculator
          </button>
          {isEstimatorOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-[#1c1549] rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <button
                  onClick={closeEstimator}
                  className="mt-4 px-4 py-2 bg-[#00cada] text-white rounded-lg hover:bg-[#0099a8] mx-5"
                >
                  Close
                </button>
                <FileTransferEstimator />
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Nmap Scan</h2>
          <p className="text-white mt-1">{results.nmap}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Open Ports</h2>
          <p className="text-white mt-1">{results.ports}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Services</h2>
          <p className="text-white mt-1">{results.services}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Vulnerability Scan</h2>
          <p className="text-white mt-1">{results.vuln}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">SSL Check</h2>
          <p className="text-white mt-1">{results.ssl}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#00cada]">Firewall Check</h2>
          <p className="text-white mt-1">{results.firewall}</p>
        </div>

        <div className="bg-[#1c1549] shadow-lg rounded-2xl p-6 col-span-3">
          <h2 className="text-xl font-semibold text-[#00cada]">Historical Performance</h2>
          <canvas id="historyChart"></canvas>
        </div>
      </div>
    </div>
  );
};

export default NetworkTestApp;