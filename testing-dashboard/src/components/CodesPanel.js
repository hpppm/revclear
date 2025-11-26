"use client";

import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import ThinkingIndicator from "./ui/ThinkingIndicator";
import { useLogger } from "@/contexts/LogContext";

export default function CodesPanel() {
    const { log } = useLogger();
    const [encounterId, setEncounterId] = useState("");
    const [aiMatches, setAiMatches] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState("icd");
    const [searchResults, setSearchResults] = useState(null);
    const [savedCodes, setSavedCodes] = useState(null);
    const [claim, setClaim] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState("Enter an encounter ID to begin testing.");

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

    // Get AI code matches
    const handleGetMatches = async () => {
        if (!encounterId.trim()) {
            setStatus("Please enter an encounter ID");
            return;
        }

        setIsLoading(true);
        setStatus("Fetching AI code matches...");
        setAiMatches(null);

        try {
            const token = localStorage.getItem("revclear-token");
            const response = await fetch(
                `${API_BASE}/api/encounters/${encounterId}/codes/match`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            setAiMatches(result.data);
            setStatus(`Found ${result.data.icdMatches.length} ICD + ${result.data.cptMatches.length} CPT matches`);
            log("AI code matches retrieved", "success", result);
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            log("AI code matches failed", "error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Manual search
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setStatus("Please enter a search query");
            return;
        }

        setIsLoading(true);
        setStatus("Searching codes...");
        setSearchResults(null);

        try {
            const token = localStorage.getItem("revclear-token");
            const response = await fetch(
                `${API_BASE}/api/codes/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            setSearchResults(result.data);
            setStatus(`Found ${result.data.length} matching codes`);
            log("Code search completed", "success", result);
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            log("Code search failed", "error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get saved codes
    const handleGetSavedCodes = async () => {
        if (!encounterId.trim()) {
            setStatus("Please enter an encounter ID");
            return;
        }

        setIsLoading(true);
        setStatus("Fetching saved codes...");
        setSavedCodes(null);

        try {
            const token = localStorage.getItem("revclear-token");
            const response = await fetch(
                `${API_BASE}/api/encounters/${encounterId}/codes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            setSavedCodes(result.data);
            setStatus(`Retrieved ${result.data.length} saved codes`);
            log("Saved codes retrieved", "success", result);
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            log("Saved codes retrieval failed", "error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate claim
    const handleGenerateClaim = async () => {
        if (!encounterId.trim()) {
            setStatus("Please enter an encounter ID");
            return;
        }

        setIsLoading(true);
        setStatus("Generating claim...");
        setClaim(null);

        try {
            const token = localStorage.getItem("revclear-token");
            const response = await fetch(
                `${API_BASE}/api/encounters/${encounterId}/claim`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            setClaim(result.data);
            setStatus("Claim generated successfully");
            log("Claim generated", "success", result);
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            log("Claim generation failed", "error", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card
            header={<h3>Medical Codes & Claims Testing</h3>}
            className="service-panel space-y-6">
            {/* Encounter ID Input */}
            <section className="s3-card p-6 space-y-4">
                <div className="s3-card-header">
                    <span>🆔 Encounter ID</span>
                </div>
                <input
                    type="text"
                    value={encounterId}
                    onChange={(e) => setEncounterId(e.target.value)}
                    placeholder="Enter encounter UUID"
                    className="w-full p-2 border rounded"
                />
                <div className="text-sm text-gray-600">{status}</div>
            </section>

            <div className="grid md:grid-cols-2 gap-6">
                {/* AI Code Matching */}
                <section className="s3-card p-6 space-y-4">
                    <div className="s3-card-header">
                        <span>🤖 AI Code Matching</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Get top 3 ICD-10 and CPT code suggestions from AI based on SOAP note
                    </p>
                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleGetMatches}
                        disabled={isLoading || !encounterId.trim()}>
                        {isLoading ? "Loading..." : "Get AI Matches"}
                    </Button>

                    {isLoading && !aiMatches ? (
                        <ThinkingIndicator message="AI is analyzing SOAP note for codes..." />
                    ) : aiMatches ? (
                        <div className="space-y-3">
                            <div>
                                <div className="font-semibold text-sm mb-2">ICD-10 Matches:</div>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[200px]">
                                    {JSON.stringify(aiMatches.icdMatches, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <div className="font-semibold text-sm mb-2">CPT Matches:</div>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[200px]">
                                    {JSON.stringify(aiMatches.cptMatches, null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : null}
                </section>

                {/* Manual Search */}
                <section className="s3-card p-6 space-y-4">
                    <div className="s3-card-header">
                        <span>🔍 Manual Code Search</span>
                    </div>
                    <div className="space-y-2">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="w-full p-2 border rounded">
                            <option value="icd">ICD-10 (Diagnosis)</option>
                            <option value="cpt">CPT (Procedure)</option>
                        </select>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by code or description"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleSearch}
                        disabled={isLoading || !searchQuery.trim()}>
                        {isLoading ? "Searching..." : "Search Codes"}
                    </Button>
                    {searchResults && (
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[280px]">
                            {JSON.stringify(searchResults, null, 2)}
                        </pre>
                    )}
                </section>

                {/* Saved Codes */}
                <section className="s3-card p-6 space-y-4">
                    <div className="s3-card-header">
                        <span>💾 Saved Codes</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Retrieve user-selected codes for this encounter
                    </p>
                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleGetSavedCodes}
                        disabled={isLoading || !encounterId.trim()}>
                        {isLoading ? "Loading..." : "Get Saved Codes"}
                    </Button>
                    {savedCodes && (
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[280px]">
                            {JSON.stringify(savedCodes, null, 2)}
                        </pre>
                    )}
                </section>

                {/* Claim Generation */}
                <section className="s3-card p-6 space-y-4">
                    <div className="s3-card-header">
                        <span>📄 Insurance Claim</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Generate insurance claim from selected codes
                    </p>
                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleGenerateClaim}
                        disabled={isLoading || !encounterId.trim()}>
                        {isLoading ? "Generating..." : "Generate Claim"}
                    </Button>
                    {claim && (
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-[280px]">
                            {JSON.stringify(claim, null, 2)}
                        </pre>
                    )}
                </section>
            </div>
        </Card>
    );
}
