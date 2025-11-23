"use client";

import Image from "next/image";
import { useState } from "react";
import { FiCopy, FiGithub } from "react-icons/fi";

export default function Home() {
  const [inputUrl, setInputUrl] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = () => {
    try {
      const match = inputUrl.match(/\/read\/([a-z0-9]+)#?/i);
      if (match && match[1]) {
        setGeneratedLink(`${window.location.origin}/view/${match[1]}`);
      } else {
        alert("Invalid Overleaf URL. Please check and try again.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // tooltip disappears after 2s
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center  font-sans bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-6  bg-black sm:items-center">
        <h1 className="text-4xl font-bold text-center font-mono text-white mb-8">
          Get Your Static <span className="text-green-600">Overleaf</span> Link.
        </h1>

        {/* Input + Button */}
        <div className="flex w-full max-w-md gap-2 mb-6 flex-col sm:flex-row">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Put in your public Overleaf URL"
            className="w-full rounded-md border border-gray-950 px-4 py-2 text-white bg-zinc-800  focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            onClick={handleGenerateLink}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-white text-black border border-white flex items-center justify-center gap-2 whitespace-nowrap hover:bg-black hover:text-white transition-colors"
          >
            Get Your Link
          </button>
        </div>

        {/* Generated Link Display */}
        {generatedLink && (
          <div className="flex w-full max-w-md items-center justify-between gap-2 mb-4 relative">
            <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-md px-3 py-2 flex items-center justify-center">
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-white font-light text-center "
              >
                {generatedLink}
              </a>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-md bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors relative"
            >
              <FiCopy size={18} />
              {copied && (
                <span className="absolute -top-6 right-0 bg-zinc-700 text-white text-m px-2 py-1 rounded-md">
                  Copied!
                </span>
              )}
            </button>
          </div>
        )}
        <div className="w-full max-w-max p-4 mb-10 bg-black rounded-md text-sm text-zinc-300">
          <p>
            <strong>
              Open project → Sharing → Turn on link sharing → Get public link
            </strong>
            .
          </p>
          <p className="mt-2  text-gray-400 break-all">
            Example:{" "}
            <span className="font-mono">
              https://www.overleaf.com/read/abcd1234efgh
            </span>
          </p>
        </div>

        {/* View in GitHub Button */}

        <a
          href="https://github.com/sree-vignesh/overleaf-viewer"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 flex items-center gap-2 rounded-md bg-black text-white px-4 py-2 hover:bg-white hover:text-black border border-white transition-colors"
        >
          <FiGithub size={18} />
          View Source
        </a>
      </main>
    </div>
  );
}
