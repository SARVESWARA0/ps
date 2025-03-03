"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useFileProcessing } from "./unzip";
import JSZip from "jszip";
import "../globals.css";

const MAX_FILE_SIZE_MB = 50;

// Build a nested tree from flat file paths.
const buildFileTree = (files) => {
  const tree = {};
  files.forEach((file) => {
    const parts = file.name.split("/");
    let current = tree;
    parts.forEach((part, idx) => {
      if (!current[part]) {
        current[part] = { __children: {} };
      }
      if (idx === parts.length - 1) {
        current[part].file = file;
      }
      current = current[part].__children;
    });
  });
  return tree;
};

// Recursive component for collapsible folder tree.
const FileTree = ({ tree, onSelectFile, level = 0 }) => {
  return (
    <ul className={`ml-${level * 4} space-y-1`}>
      {Object.entries(tree).map(([key, node]) => {
        const isFile = !!node.file;
        return (
          <FileTreeNode
            key={key}
            nodeKey={key}
            node={node}
            isFile={isFile}
            onSelectFile={onSelectFile}
            level={level}
          />
        );
      })}
    </ul>
  );
};

const FileTreeNode = ({ nodeKey, node, isFile, onSelectFile, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = () => {
    if (!isFile) {
      setIsOpen((prev) => !prev);
    } else {
      onSelectFile(node.file);
    }
  };

  return (
    <li>
      <div className="flex items-center justify-between">
        <div
          onClick={handleClick}
          className="cursor-pointer flex items-center px-2 py-1 rounded hover:bg-blue-100 transition-colors"
        >
          {!isFile && (
            <span className="mr-2">
              {isOpen ? (
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          )}
          <span className="font-medium text-gray-700">{nodeKey}</span>
        </div>
      </div>
      {!isFile && isOpen && (
        <FileTree tree={node.__children} onSelectFile={onSelectFile} level={level + 1} />
      )}
    </li>
  );
};

// Modal that shows folder tree and file preview.
const FolderPreviewModal = ({ fileTree, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">File Browser</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Left Panel: Folder Tree */}
          <div className="md:w-1/3 border-r overflow-y-auto p-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Folders</h3>
            {Object.keys(fileTree).length > 0 ? (
              <FileTree tree={fileTree} onSelectFile={setSelectedFile} />
            ) : (
              <p className="text-gray-500">No files found.</p>
            )}
          </div>
          {/* Right Panel: File Preview */}
          <div className="md:w-2/3 p-4 overflow-y-auto">
            {selectedFile ? (
              <>
                <h4 className="text-xl font-semibold mb-4 text-gray-800">
                  {selectedFile.name.split("/").pop()}
                </h4>
                <pre className="whitespace-pre-wrap break-words text-sm text-gray-700">
                  {selectedFile.content}
                </pre>
              </>
            ) : (
              <p className="text-gray-500">Select a file from the folder tree to preview its content.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FileDropZoneWithPreview = ({ onGlobalFileData }) => {
  const { isLoading } = useFileProcessing();
  const [isDragging, setIsDragging] = useState(false);
  const [globalFileData, setGlobalFileData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setIsDragging(false);
      setErrorMessage("");

      const files = Array.from(e.dataTransfer.files);
      const zipFile = files.find((file) => file.name.endsWith(".zip"));
      if (!zipFile) {
        setErrorMessage("Please drop a valid ZIP file.");
        return;
      }

      const fileSizeMB = zipFile.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setErrorMessage(`File size exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
        return;
      }

      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipFile);
        const fileDataPromises = Object.keys(loadedZip.files).map(async (filename) => {
          const file = loadedZip.files[filename];
          if (
            file.dir ||
            filename.startsWith("__MACOSX") ||
            filename.startsWith(".") ||
            filename === "package.json" ||
            filename === "package-lock.json"
          ) {
            return null;
          }
          const content = await file.async("string");
          return { name: filename, content };
        });
        const allFileData = (await Promise.all(fileDataPromises)).filter(Boolean);
        setGlobalFileData(allFileData);
        onGlobalFileData(allFileData);
      } catch (error) {
        setErrorMessage("An error occurred while processing the ZIP file.");
      }
    },
    [onGlobalFileData]
  );

  const fileTree = useMemo(() => buildFileTree(globalFileData), [globalFileData]);

  return (
    <div className="dropzone-container mb-8">
      <div
        className={`dropzone transition-all duration-300 ease-in-out border-4 rounded-xl p-10 text-center cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        } ${isLoading ? "opacity-70" : "opacity-100"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p className="text-xl font-semibold text-gray-700">
          {isDragging ? "Release to drop the ZIP file" : "Drag & drop ZIP file here"}
        </p>
        {isLoading && (
          <div className="mt-4">
            <span className="inline-block animate-spin rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></span>
            <p className="mt-2 text-sm text-gray-600">Processing files...</p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg shadow-sm">
          {errorMessage}
        </div>
      )}

      {globalFileData.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded transition-colors"
          >
            Preview Files
          </button>
        </div>
      )}

      {modalOpen && <FolderPreviewModal fileTree={fileTree} onClose={() => setModalOpen(false)} />}
    </div>
  );
};

export default FileDropZoneWithPreview;
