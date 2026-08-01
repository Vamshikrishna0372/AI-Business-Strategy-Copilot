/**
 * Reports Service
 * Centralized API client for the Reports Center & version history management.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

export interface BackendReport {
  id: string;
  startup_id: string;
  user_id: string;
  report_type: string;
  title: string;
  version: number;
  status: string;
  ai_provider: string;
  confidence: number;
  content: Record<string, any>;
  conversation_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedReports {
  success: boolean;
  message: string;
  data: BackendReport[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const reportsService = {
  async listReports(skip = 0, limit = 50): Promise<BackendReport[]> {
    const res = await apiClient.get<PaginatedReports>(`/api/v1/reports?skip=${skip}&limit=${limit}`);
    return res?.data ?? [];
  },

  async getReportById(reportId: string): Promise<BackendReport | null> {
    const res = await apiClient.get<{ success: boolean; data: BackendReport }>(`/api/v1/reports/${reportId}`);
    return res?.data ?? null;
  },

  async getReportHistory(reportType: string): Promise<BackendReport[]> {
    const res = await apiClient.get<{ success: boolean; data: BackendReport[] }>(
      `/api/v1/reports/history?report_type=${reportType}`
    );
    return res?.data ?? [];
  },

  async regenerateReport(reportType: string, customInstructions?: string): Promise<BackendReport> {
    const res = await apiClient.post<{ success: boolean; data: BackendReport }>("/api/v1/reports/regenerate", {
      report_type: reportType,
      custom_instructions: customInstructions,
    });
    eventBus.emit(EVENTS.AI_REPORT_GENERATED, { report_type: reportType, res: res.data });
    return res.data;
  },

  // Export helpers for browser download
  downloadAsJson(report: BackendReport) {
    const blob = new Blob([JSON.stringify(report.content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_type}_v${report.version}_${report.startup_id.slice(-6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportAsFormattedText(report: BackendReport) {
    const header = `=========================================================\n${report.title.toUpperCase()} (v${report.version})\nAI Provider: ${report.ai_provider} | Confidence: ${report.confidence}%\nGenerated: ${report.created_at}\n=========================================================\n\n`;
    const body = typeof report.content === "string" ? report.content : JSON.stringify(report.content, null, 2);
    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_type}_v${report.version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
