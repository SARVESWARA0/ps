"use client"
import { useState } from "react"
import FileDropZone from "./components/FileDropZone"
import PostContents from "./components/PostContent"
import "./globals.css"

const CodEvaComponent = () => {
  const [fileNames, setFileNames] = useState([])
  const [fileContents, setFileContents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGlobalFileData = (fileData) => {
    const names = fileData.map((file) => file.name)
    const contents = fileData.map((file) => file.content)
    setFileNames(names)
    setFileContents(contents)
  }

  return (
    <div className="codeva-component bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="audiowide text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent py-4">
            CodEva<span className="text-blue-400">🛠️</span>
          </h1>
          <p className="text-gray-600 mt-2">Code Evaluation and Analysis Tool</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 transition-all duration-300 hover:shadow-md border border-gray-100">
          <FileDropZone
            className="file-drop-zone border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors duration-300"
            onGlobalFileData={handleGlobalFileData}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-md border border-gray-100">
          <PostContents
            className="file-list"
            fileNames={fileNames}
            fileContents={fileContents}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodEvaComponent

