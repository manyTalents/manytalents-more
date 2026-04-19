/**
 * Inventory API — typed wrappers for the HCP inventory & limbo endpoints.
 * Kept separate from frappe.ts to avoid file bloat.
 */

import { callMethod } from "@/lib/frappe";

const INV_API = "hcp_replacement.hcp_replacement.api.inventory";
const LIMBO_API = "hcp_replacement.hcp_replacement.api.limbo";

// ──────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────

export type ReceiptStatus = "Pending" | "Complete" | "Failed";

export type ItemDestination =
  | "This Job"
  | "Truck"
  | "Office"
  | "Limbo"
  | "Diff Job"
  | "Returned"
  | "Lost";

export interface ReceiptItem {
  name: string;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  matched_item: string;
  matched_item_name: string;
  match_score: number;
  destination: ItemDestination;
  dispatched: boolean;
}

export interface DispatchSummary {
  total: number;
  dispatched: number;
  pending: number;
  limbo: number;
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

export interface InventorySummary {
  pending_receipts: number;
  pending_limbo_items: number;
  restock_items: number;
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  return callMethod<InventorySummary>(`${INV_API}.get_inventory_summary`);
}

// ──────────────────────────────────────────────
// Receipts
// ──────────────────────────────────────────────

export interface ReceiptRow {
  name: string;
  supplier: string;
  buyer_name: string;
  receipt_date: string;
  hcp_job: string;
  hcp_job_id: string;
  parsed_total: number;
  item_count: number;
  status: ReceiptStatus;
}

export interface ReceiptsResponse {
  receipts: ReceiptRow[];
  total_count: number;
  has_more: boolean;
}

export async function fetchAllReceipts(
  page: number = 1,
  pageSize: number = 25,
  statusFilter: string = ""
): Promise<ReceiptsResponse> {
  return callMethod<ReceiptsResponse>(`${INV_API}.get_all_receipts`, {
    page,
    page_size: pageSize,
    status_filter: statusFilter,
  });
}

// ──────────────────────────────────────────────
// Receipt detail
// ──────────────────────────────────────────────

export interface ReceiptDetail {
  name: string;
  supplier: string;
  buyer_name: string;
  receipt_date: string;
  hcp_job: string;
  hcp_job_id: string;
  parsed_total: number;
  items: ReceiptItem[];
  dispatch_summary: DispatchSummary;
}

export async function fetchReceiptDetail(receiptName: string): Promise<ReceiptDetail> {
  return callMethod<ReceiptDetail>(`${INV_API}.get_receipt_detail`, {
    receipt_name: receiptName,
  });
}

// ──────────────────────────────────────────────
// Warehouses
// ──────────────────────────────────────────────

export interface WarehouseCard {
  name: string;
  display_name: string;
  total_items: number;
  total_qty: number;
  total_value: number;
  low_stock_count: number;
}

export interface WarehouseListResponse {
  my_truck: WarehouseCard | null;
  office: WarehouseCard[];
  other_trucks: WarehouseCard[];
}

export async function fetchWarehouseList(): Promise<WarehouseListResponse> {
  return callMethod<WarehouseListResponse>(`${INV_API}.get_warehouse_list`);
}

// ──────────────────────────────────────────────
// Warehouse stock
// ──────────────────────────────────────────────

export interface StockItem {
  item_code: string;
  item_name: string;
  actual_qty: number;
  valuation_rate: number;
  stock_value: number;
  is_low_stock: boolean;
}

export interface WarehouseStockResponse {
  items: StockItem[];
  total_count: number;
  has_more: boolean;
  warehouse: string;
}

export async function fetchWarehouseStock(
  warehouse: string,
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  stockFilter: string = ""
): Promise<WarehouseStockResponse> {
  return callMethod<WarehouseStockResponse>(`${INV_API}.get_warehouse_stock`, {
    warehouse,
    page,
    page_size: pageSize,
    search,
    stock_filter: stockFilter,
  });
}

// ──────────────────────────────────────────────
// Dispatch
// ──────────────────────────────────────────────

export interface DispatchItemInput {
  item_name: string;
  destination: ItemDestination;
  target_warehouse?: string;
  target_job?: string;
}

export interface DispatchResult {
  dispatched: number;
  failed: number;
  results: { item_name: string; success: boolean; message?: string }[];
}

export async function dispatchItems(
  jobName: string,
  items: DispatchItemInput[]
): Promise<DispatchResult> {
  return callMethod<DispatchResult>(`${INV_API}.dispatch_items`, {
    hcp_job_name: jobName,
    items_json: JSON.stringify(items),
  });
}

export async function dispatchAllToJob(jobName: string): Promise<DispatchResult> {
  return callMethod<DispatchResult>(`${INV_API}.dispatch_all_to_job`, {
    hcp_job_name: jobName,
  });
}

// ──────────────────────────────────────────────
// Limbo
// ──────────────────────────────────────────────

export interface LimboGroup {
  receipt_name: string;
  supplier: string;
  hcp_job: string;
  hcp_job_id: string;
  items: ReceiptItem[];
}

export interface LimboResponse {
  groups: LimboGroup[];
  total_items: number;
}

export async function fetchLimboItems(): Promise<LimboResponse> {
  return callMethod<LimboResponse>(`${LIMBO_API}.get_global_limbo`);
}

// ──────────────────────────────────────────────
// Restock
// ──────────────────────────────────────────────

const RESTOCK_API = "hcp_replacement.hcp_replacement.api.restock";

export type PullItemStatus = "Pending" | "Pulled" | "Accepted" | "Rejected" | "Ignored";

export interface PullListItem {
  name: string;
  truck_warehouse: string;
  truck_label: string;
  item_code: string;
  item_name: string;
  required_qty: number;
  pulled_qty: number;
  status: PullItemStatus;
  pulled_by: string;
  pulled_at: string;
  confirmed_by: string;
  confirmed_at: string;
  reject_note: string;
  source_job: string;
  source_job_id: string;
}

export interface TruckPullList {
  warehouse: string;
  label: string;
  items: PullListItem[];
  pending_count: number;
  pulled_count: number;
  rejected_count: number;
}

export interface PullListsResponse {
  trucks: TruckPullList[];
}

export interface PullSummary {
  pending: number;
  pulled: number;
  rejected: number;
  total_active: number;
}

export async function fetchPullLists(date?: string): Promise<PullListsResponse> {
  return callMethod<PullListsResponse>(`${RESTOCK_API}.get_pull_lists`, date ? { date } : {});
}

export async function generatePullList(date?: string): Promise<{ created: number; date: string }> {
  return callMethod(`${RESTOCK_API}.generate_pull_list`, date ? { date } : {});
}

export async function markPulled(items: PullListItem[]): Promise<{ pulled: number }> {
  return callMethod(`${RESTOCK_API}.mark_pulled`, {
    items_json: JSON.stringify(items.map((i) => i.name)),
  });
}

export async function acceptPullList(
  truckWarehouse: string,
  date?: string
): Promise<{ accepted: number; stock_entry: string }> {
  return callMethod(`${RESTOCK_API}.accept_pull_list`, {
    truck_warehouse: truckWarehouse,
    ...(date ? { date } : {}),
  });
}

export async function rejectPullItem(
  name: string,
  rejectNote: string
): Promise<{ status: string }> {
  return callMethod(`${RESTOCK_API}.reject_pull_item`, { name, reject_note: rejectNote });
}

export async function resolveRejection(
  name: string,
  newItemCode?: string,
  newQty?: number
): Promise<{ resolved: boolean }> {
  return callMethod(`${RESTOCK_API}.resolve_rejection`, {
    name,
    ...(newItemCode ? { new_item_code: newItemCode } : {}),
    ...(newQty !== undefined ? { new_qty: newQty } : {}),
  });
}

export async function ignorePullItem(name: string): Promise<{ status: string }> {
  return callMethod(`${RESTOCK_API}.ignore_pull_item`, { name });
}

export async function addToPullList(
  truckWarehouse: string,
  itemCode: string,
  qty: number,
  date?: string
): Promise<{ name: string }> {
  return callMethod(`${RESTOCK_API}.add_to_pull_list`, {
    truck_warehouse: truckWarehouse,
    item_code: itemCode,
    qty,
    ...(date ? { date } : {}),
  });
}

export async function fetchPullSummary(): Promise<PullSummary> {
  return callMethod<PullSummary>(`${RESTOCK_API}.get_pull_summary`);
}
