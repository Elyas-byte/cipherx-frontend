"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import {
  File,
  Image,
  Video,
  FileText,
  Archive,
  Wifi,
  NetworkIcon as Ethernet,
  NetworkIcon as PeerToPeer,
  ArrowRight,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type FileUnit = "bytes" | "KB" | "MB" | "GB" | "TB"

const units: FileUnit[] = ["bytes", "KB", "MB", "GB", "TB"]

const unitSizes: Record<FileUnit, number> = {
  bytes: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
}

interface FileData {
  name: string
  size: number
  unit: FileUnit
  type: string
}

const convertToBytes = (size: number, unit: FileUnit): number => size * unitSizes[unit]

const convertFromBytes = (bytes: number): { size: number; unit: FileUnit } => {
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return { size: Number.parseFloat(size.toFixed(2)), unit: units[unitIndex] }
}

const calculateTime = (size: number, speed: number): number => (size * 8) / (speed * 1024 * 1024)

export const FileTransferEstimator: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([])
  const [downloadSpeed, setDownloadSpeed] = useState<number>(1)
  const [uploadSpeed, setUploadSpeed] = useState<number>(2)
  const [compressionEnabled, setCompressionEnabled] = useState<boolean>(false)
  const [compressionRate, setCompressionRate] = useState<number>(50)
  const [downloadTime, setDownloadTime] = useState<number>(0)
  const [uploadTime, setUploadTime] = useState<number>(0)
  const [networkLatency, setNetworkLatency] = useState<number>(50)
  const [currentBandwidth, setCurrentBandwidth] = useState<number>(0)
  const [cloudProvider, setCloudProvider] = useState<string>("none")
  const [cloudUploadTime, setCloudUploadTime] = useState<number>(0)
  const [isVpnEnabled, setIsVpnEnabled] = useState<boolean>(false)
  const [connectionType, setConnectionType] = useState<"wifi" | "ethernet">("wifi")
  const [transferType, setTransferType] = useState<"direct" | "p2p">("direct")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const simulateBandwidthMonitoring = useCallback(() => {
    const baseBandwidth = (downloadSpeed + uploadSpeed) / 2
    const fluctuation = Math.random() * 0.2 - 0.1 // -10% to +10% fluctuation
    setCurrentBandwidth(baseBandwidth * (1 + fluctuation))
  }, [downloadSpeed, uploadSpeed])

  useEffect(() => {
    const intervalId = setInterval(simulateBandwidthMonitoring, 5000) // Update every 5 seconds
    return () => clearInterval(intervalId)
  }, [simulateBandwidthMonitoring])

  const calculateTimeWithLatency = (size: number, speed: number): number => {
    const baseTime = calculateTime(size, speed)
    return baseTime + networkLatency / 1000 // Convert latency from ms to seconds
  }

  const estimateCloudUploadTime = (size: number): number => {
    const cloudSpeedFactors: Record<string, number> = {
      none: 1,
      "google-drive": 0.9,
      "aws-s3": 1.1,
      onedrive: 0.95,
    }
    const effectiveSpeed = uploadSpeed * cloudSpeedFactors[cloudProvider]
    return calculateTimeWithLatency(size, effectiveSpeed)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const fileData = selectedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      unit: "bytes" as FileUnit,
      type: file.type,
    }))
    setFiles(fileData)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    const fileData = droppedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      unit: "bytes" as FileUnit,
      type: file.type,
    }))
    setFiles(fileData)
  }

  const handleEstimate = () => {
    let totalSizeBytes = files.reduce((sum, file) => sum + convertToBytes(file.size, file.unit), 0)

    if (compressionEnabled) {
      totalSizeBytes *= 1 - compressionRate / 100
    }

    const { size: finalSize } = convertFromBytes(totalSizeBytes)

    let effectiveDownloadSpeed = downloadSpeed
    let effectiveUploadSpeed = uploadSpeed

    if (isVpnEnabled) {
      effectiveDownloadSpeed *= 0.9
      effectiveUploadSpeed *= 0.9
    }

    if (connectionType === "ethernet") {
      effectiveDownloadSpeed *= 1.2
      effectiveUploadSpeed *= 1.2
    }

    if (transferType === "p2p") {
      effectiveDownloadSpeed *= 0.8
      effectiveUploadSpeed *= 0.8
    }

    const downloadTimeValue = calculateTimeWithLatency(finalSize, effectiveDownloadSpeed)
    const uploadTimeValue = calculateTimeWithLatency(finalSize, effectiveUploadSpeed)
    const cloudUploadTimeValue = estimateCloudUploadTime(finalSize)

    setDownloadTime(downloadTimeValue)
    setUploadTime(uploadTimeValue)
    setCloudUploadTime(cloudUploadTimeValue)
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />
    if (fileType.startsWith("text/")) return <FileText className="h-4 w-4" />
    if (fileType.includes("compressed") || fileType.includes("zip")) return <Archive className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const chartData = [
    { name: "Download", time: downloadTime },
    { name: "Upload", time: uploadTime },
    { name: "Cloud Upload", time: cloudUploadTime },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto mt-1 p-6 bg-white shadow-lg rounded-lg">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Advanced File Transfer Estimator</h1>
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="fileUpload"
              multiple
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Choose Files
            </button>
            <p className="mt-2 text-sm text-gray-500">or drag and drop files here</p>
          </div>
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-gray-700">Selected Files:</h3>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    {getFileIcon(file.type)}
                    <span className="ml-2">
                      {file.name} - {convertFromBytes(file.size).size.toFixed(2)} {convertFromBytes(file.size).unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-4">
            <div className="bg-gray-100 p-2 rounded-md">
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded-md ${
                    connectionType === "wifi" ? "bg-blue-500 text-white" : "bg-white text-gray-700"
                  }`}
                  onClick={() => setConnectionType("wifi")}
                >
                  <Wifi className="mr-2 h-4 w-4 inline" /> Wi-Fi
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${
                    connectionType === "ethernet" ? "bg-green-500 text-white" : "bg-white text-gray-700"
                  }`}
                  onClick={() => setConnectionType("ethernet")}
                >
                  <Ethernet className="mr-2 h-4 w-4 inline" /> Ethernet
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="downloadSpeed" className="block text-sm font-medium text-gray-700">
                  Download Speed (Mbps)
                </label>
                <input
                  id="downloadSpeed"
                  type="number"
                  value={downloadSpeed}
                  onChange={(e) => setDownloadSpeed(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="uploadSpeed" className="block text-sm font-medium text-gray-700">
                  Upload Speed (Mbps)
                </label>
                <input
                  id="uploadSpeed"
                  type="number"
                  value={uploadSpeed}
                  onChange={(e) => setUploadSpeed(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="networkLatency" className="block text-sm font-medium text-gray-700">
                  Network Latency (ms)
                </label>
                <input
                  id="networkLatency"
                  type="number"
                  value={networkLatency}
                  onChange={(e) => setNetworkLatency(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Bandwidth (Mbps)</label>
                <p className="mt-1 text-gray-600">{currentBandwidth.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="vpnEnabled"
                checked={isVpnEnabled}
                onChange={(e) => setIsVpnEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="vpnEnabled" className="text-sm font-medium text-gray-700">
                VPN Enabled
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compressionEnabled"
                checked={compressionEnabled}
                onChange={(e) => setCompressionEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="compressionEnabled" className="text-sm font-medium text-gray-700">
                Enable Compression
              </label>
            </div>
            {compressionEnabled && (
              <div>
                <label htmlFor="compressionRate" className="block text-sm font-medium text-gray-700">
                  Compression Rate (%)
                </label>
                <input
                  id="compressionRate"
                  type="number"
                  value={compressionRate}
                  onChange={(e) => setCompressionRate(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            <div className="bg-gray-100 p-2 rounded-md">
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded-md ${
                    transferType === "direct" ? "bg-purple-500 text-white" : "bg-white text-gray-700"
                  }`}
                  onClick={() => setTransferType("direct")}
                >
                  <ArrowRight className="mr-2 h-4 w-4 inline" /> Direct
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${
                    transferType === "p2p" ? "bg-orange-500 text-white" : "bg-white text-gray-700"
                  }`}
                  onClick={() => setTransferType("p2p")}
                >
                  <PeerToPeer className="mr-2 h-4 w-4 inline" /> P2P
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="cloudProvider" className="block text-sm font-medium text-gray-700">
                Cloud Storage Provider
              </label>
              <select
                id="cloudProvider"
                value={cloudProvider}
                onChange={(e) => setCloudProvider(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">None</option>
                <option value="google-drive">Google Drive</option>
                <option value="aws-s3">AWS S3</option>
                <option value="onedrive">OneDrive</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleEstimate}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm"
          >
            Estimate Transfer Time
          </button>
          {downloadTime > 0 && (
            <div className="w-full space-y-2">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <h3 className="text-blue-800 font-semibold">Estimated Download Time</h3>
                <p className="text-blue-700">{downloadTime.toFixed(2)} seconds</p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                <h3 className="text-green-800 font-semibold">Estimated Upload Time</h3>
                <p className="text-green-700">{uploadTime.toFixed(2)} seconds</p>
              </div>
              {cloudProvider !== "none" && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-md">
                  <h3 className="text-purple-800 font-semibold">Estimated Cloud Upload Time ({cloudProvider})</h3>
                  <p className="text-purple-700">{cloudUploadTime.toFixed(2)} seconds</p>
                </div>
              )}
            </div>
          )}
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="name" stroke="#333" />
                <YAxis stroke="#333" />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
    );
};

export default FileTransferEstimator;