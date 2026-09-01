export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          record_id: string | null
          table_name: string | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string | null
          table_name?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string | null
          table_name?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      azp_application_balances: {
        Row: {
          current_balance: number
          module: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_balance?: number
          module: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_balance?: number
          module?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      azp_audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          detail: Json | null
          entity: string
          entity_id: string | null
          id: number
          module: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          detail?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          module: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          detail?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
          module?: string
        }
        Relationships: []
      }
      azp_cards: {
        Row: {
          active: boolean
          card_no: string
          created_at: string
          created_by: string | null
          holder: string
          id: string
          module: string
          note: string | null
          project: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          card_no: string
          created_at?: string
          created_by?: string | null
          holder: string
          id?: string
          module: string
          note?: string | null
          project?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          card_no?: string
          created_at?: string
          created_by?: string | null
          holder?: string
          id?: string
          module?: string
          note?: string | null
          project?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      azp_movements: {
        Row: {
          amount: number
          app_balance_effect: boolean
          cancel_reason: string | null
          cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          card_id: string
          created_at: string
          created_by: string | null
          doc_num: string | null
          id: number
          kind: string
          module: string
          note: string | null
          op_date: string | null
          replaced_by: number | null
          replaces_id: number | null
          vat_included: boolean
        }
        Insert: {
          amount: number
          app_balance_effect?: boolean
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_id: string
          created_at?: string
          created_by?: string | null
          doc_num?: string | null
          id?: never
          kind: string
          module: string
          note?: string | null
          op_date?: string | null
          replaced_by?: number | null
          replaces_id?: number | null
          vat_included?: boolean
        }
        Update: {
          amount?: number
          app_balance_effect?: boolean
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_id?: string
          created_at?: string
          created_by?: string | null
          doc_num?: string | null
          id?: never
          kind?: string
          module?: string
          note?: string | null
          op_date?: string | null
          replaced_by?: number | null
          replaces_id?: number | null
          vat_included?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "azp_movements_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "azp_card_balances"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "azp_movements_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "azp_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azp_movements_replaced_by_fk"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "azp_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azp_movements_replaces_fk"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "azp_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      item_requests: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          created_warehouse: string | null
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          item_code: string | null
          name: string
          name_norm: string
          note: string | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          created_warehouse?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          item_code?: string | null
          name: string
          name_norm: string
          note?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          created_warehouse?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          item_code?: string | null
          name?: string
          name_norm?: string
          note?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_requests_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          name: string
          price: number | null
          price_source: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          name: string
          price?: number | null
          price_source?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          name?: string
          price?: number | null
          price_source?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          channel: string | null
          contract_num: string | null
          created_at: string | null
          created_by: string | null
          date: string
          doc_num: string | null
          id: string
          in_qty: number | null
          invoice_num: string | null
          item_code: string
          note: string | null
          out_qty: number | null
          partner: string | null
          price: number | null
          type: string
          warehouse: string
        }
        Insert: {
          channel?: string | null
          contract_num?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          doc_num?: string | null
          id?: string
          in_qty?: number | null
          invoice_num?: string | null
          item_code: string
          note?: string | null
          out_qty?: number | null
          partner?: string | null
          price?: number | null
          type: string
          warehouse: string
        }
        Update: {
          channel?: string | null
          contract_num?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          doc_num?: string | null
          id?: string
          in_qty?: number | null
          invoice_num?: string | null
          item_code?: string
          note?: string | null
          out_qty?: number | null
          partner?: string | null
          price?: number | null
          type?: string
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "movements_warehouse_fkey"
            columns: ["warehouse"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["name"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          contract: string | null
          contract_date: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          voen: string | null
        }
        Insert: {
          active?: boolean
          contract?: string | null
          contract_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          voen?: string | null
        }
        Update: {
          active?: boolean
          contract?: string | null
          contract_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          voen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_values: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      serfiyyat_documents: {
        Row: {
          alinma_kanali: string | null
          avtomobil_nomresi: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          doc_num: string
          id: string
          invoice_num: string | null
          kontragent: string | null
          note: string | null
          project_id: string
        }
        Insert: {
          alinma_kanali?: string | null
          avtomobil_nomresi?: string | null
          created_at?: string
          created_by?: string | null
          doc_date: string
          doc_num: string
          id?: string
          invoice_num?: string | null
          kontragent?: string | null
          note?: string | null
          project_id: string
        }
        Update: {
          alinma_kanali?: string | null
          avtomobil_nomresi?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_num?: string
          id?: string
          invoice_num?: string | null
          kontragent?: string | null
          note?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "serfiyyat_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "serfiyyat_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      serfiyyat_lines: {
        Row: {
          created_at: string
          document_id: string
          id: string
          item_code: string
          line_sum: number | null
          price: number
          qty: number
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          item_code: string
          line_sum?: number | null
          price?: number
          qty: number
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          item_code?: string
          line_sum?: number | null
          price?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "serfiyyat_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "serfiyyat_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serfiyyat_lines_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
        ]
      }
      serfiyyat_projects: {
        Row: {
          active: boolean
          created_at: string
          id: string
          linked_warehouse: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          linked_warehouse?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          linked_warehouse?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          device_id: string
          device_label: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_label?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_label?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stock_conditions: {
        Row: {
          created_at: string
          icare_qty: number
          item_code: string
          note: string | null
          onsite_qty: number
          repair_qty: number
          unfit_qty: number
          updated_at: string
          updated_by: string | null
          warehouse: string
        }
        Insert: {
          created_at?: string
          icare_qty?: number
          item_code: string
          note?: string | null
          onsite_qty?: number
          repair_qty?: number
          unfit_qty?: number
          updated_at?: string
          updated_by?: string | null
          warehouse: string
        }
        Update: {
          created_at?: string
          icare_qty?: number
          item_code?: string
          note?: string | null
          onsite_qty?: number
          repair_qty?: number
          unfit_qty?: number
          updated_at?: string
          updated_by?: string | null
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_conditions_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_conditions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_layer_allocations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          layer_id: string
          price_status_snapshot: string
          qty: number
          reversed_at: string | null
          source_amount_snapshot: number | null
          source_date_snapshot: string | null
          source_doc_num_snapshot: string | null
          source_invoice_snapshot: string | null
          source_movement_id: string | null
          unit_price_snapshot: number | null
          writeoff_movement_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          layer_id: string
          price_status_snapshot: string
          qty: number
          reversed_at?: string | null
          source_amount_snapshot?: number | null
          source_date_snapshot?: string | null
          source_doc_num_snapshot?: string | null
          source_invoice_snapshot?: string | null
          source_movement_id?: string | null
          unit_price_snapshot?: number | null
          writeoff_movement_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          layer_id?: string
          price_status_snapshot?: string
          qty?: number
          reversed_at?: string | null
          source_amount_snapshot?: number | null
          source_date_snapshot?: string | null
          source_doc_num_snapshot?: string | null
          source_invoice_snapshot?: string | null
          source_movement_id?: string | null
          unit_price_snapshot?: number | null
          writeoff_movement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_layer_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_allocations_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "stock_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_allocations_source_movement_id_fkey"
            columns: ["source_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_allocations_writeoff_movement_id_fkey"
            columns: ["writeoff_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_layer_requests: {
        Row: {
          actor_id: string
          completed_at: string | null
          created_at: string
          payload: Json
          payload_hash: string
          request_key: string
          result: Json | null
        }
        Insert: {
          actor_id: string
          completed_at?: string | null
          created_at?: string
          payload: Json
          payload_hash: string
          request_key: string
          result?: Json | null
        }
        Update: {
          actor_id?: string
          completed_at?: string | null
          created_at?: string
          payload?: Json
          payload_hash?: string
          request_key?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_layer_requests_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_layer_settings: {
        Row: {
          active: boolean
          created_at: string
          cutover_at: string | null
          cutover_by: string | null
          cutover_max_created_at: string | null
          cutover_movement_count: number | null
          schema_version: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cutover_at?: string | null
          cutover_by?: string | null
          cutover_max_created_at?: string | null
          cutover_movement_count?: number | null
          schema_version?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cutover_at?: string | null
          cutover_by?: string | null
          cutover_max_created_at?: string | null
          cutover_movement_count?: number | null
          schema_version?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_layer_settings_cutover_by_fkey"
            columns: ["cutover_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_layer_transfers: {
        Row: {
          created_at: string
          created_by: string
          destination_layer_id: string
          id: string
          qty: number
          reversed_at: string | null
          source_layer_id: string
          transfer_in_movement_id: string
          transfer_out_movement_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          destination_layer_id: string
          id?: string
          qty: number
          reversed_at?: string | null
          source_layer_id: string
          transfer_in_movement_id: string
          transfer_out_movement_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          destination_layer_id?: string
          id?: string
          qty?: number
          reversed_at?: string | null
          source_layer_id?: string
          transfer_in_movement_id?: string
          transfer_out_movement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_layer_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_transfers_destination_layer_id_fkey"
            columns: ["destination_layer_id"]
            isOneToOne: false
            referencedRelation: "stock_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_transfers_source_layer_id_fkey"
            columns: ["source_layer_id"]
            isOneToOne: false
            referencedRelation: "stock_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_transfers_transfer_in_movement_id_fkey"
            columns: ["transfer_in_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layer_transfers_transfer_out_movement_id_fkey"
            columns: ["transfer_out_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_layers: {
        Row: {
          active: boolean
          available_qty: number
          created_at: string
          created_by: string | null
          id: string
          initial_qty: number
          item_code: string
          parent_layer_id: string | null
          price_status: string
          received_date: string | null
          root_movement_id: string | null
          source_doc_num: string | null
          source_invoice_num: string | null
          source_movement_id: string | null
          source_type: string
          unit_price: number | null
          updated_at: string
          warehouse: string
        }
        Insert: {
          active?: boolean
          available_qty: number
          created_at?: string
          created_by?: string | null
          id?: string
          initial_qty: number
          item_code: string
          parent_layer_id?: string | null
          price_status: string
          received_date?: string | null
          root_movement_id?: string | null
          source_doc_num?: string | null
          source_invoice_num?: string | null
          source_movement_id?: string | null
          source_type: string
          unit_price?: number | null
          updated_at?: string
          warehouse: string
        }
        Update: {
          active?: boolean
          available_qty?: number
          created_at?: string
          created_by?: string | null
          id?: string
          initial_qty?: number
          item_code?: string
          parent_layer_id?: string | null
          price_status?: string
          received_date?: string | null
          root_movement_id?: string | null
          source_doc_num?: string | null
          source_invoice_num?: string | null
          source_movement_id?: string | null
          source_type?: string
          unit_price?: number | null
          updated_at?: string
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_layers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layers_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_layers_parent_layer_id_fkey"
            columns: ["parent_layer_id"]
            isOneToOne: false
            referencedRelation: "stock_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layers_root_movement_id_fkey"
            columns: ["root_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_layers_source_movement_id_fkey"
            columns: ["source_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          role: string
          warehouse: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          role?: string
          warehouse?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          role?: string
          warehouse?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          active: boolean | null
          id: number
          name: string
          type: string | null
        }
        Insert: {
          active?: boolean | null
          id?: number
          name: string
          type?: string | null
        }
        Update: {
          active?: boolean | null
          id?: number
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      writeoff_valuations: {
        Row: {
          created_at: string
          created_by: string
          final_amount: number | null
          known_amount: number
          movement_id: string
          override_reason: string | null
          reversed_at: string | null
          reversed_by_movement_id: string | null
          source_amount: number | null
          unknown_qty: number
          valuation_method: string
        }
        Insert: {
          created_at?: string
          created_by: string
          final_amount?: number | null
          known_amount?: number
          movement_id: string
          override_reason?: string | null
          reversed_at?: string | null
          reversed_by_movement_id?: string | null
          source_amount?: number | null
          unknown_qty?: number
          valuation_method: string
        }
        Update: {
          created_at?: string
          created_by?: string
          final_amount?: number | null
          known_amount?: number
          movement_id?: string
          override_reason?: string | null
          reversed_at?: string | null
          reversed_by_movement_id?: string | null
          source_amount?: number | null
          unknown_qty?: number
          valuation_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "writeoff_valuations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writeoff_valuations_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: true
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writeoff_valuations_reversed_by_movement_id_fkey"
            columns: ["reversed_by_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      azp_card_balances: {
        Row: {
          active: boolean | null
          balance: number | null
          card_id: string | null
          card_no: string | null
          holder: string | null
          medaxil_total: number | null
          mexaric_total: number | null
          module: string | null
          mov_count: number | null
          project: string | null
          sort_order: number | null
        }
        Relationships: []
      }
      balances: {
        Row: {
          balance_qty: number | null
          balance_value: number | null
          item_code: string | null
          item_name: string | null
          last_movement_date: string | null
          movement_count: number | null
          total_in: number | null
          total_out: number | null
          unit: string | null
          unit_price: number | null
          warehouse: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "movements_warehouse_fkey"
            columns: ["warehouse"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Functions: {
      activate_stock_layers: {
        Args: {
          p_expected_max_created_at: string
          p_expected_movement_count: number
        }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          p_active?: boolean
          p_role: string
          p_user_id: string
          p_warehouse?: string
        }
        Returns: Json
      }
      apply_cond_delta: {
        Args: {
          p_delta: number
          p_item_code: string
          p_key: string
          p_warehouse: string
        }
        Returns: undefined
      }
      apply_cond_split: {
        Args: {
          p_conditions: Json
          p_doc_num: string
          p_dst: string
          p_item_code: string
          p_note: string
          p_qty: number
          p_src: string
          p_type: string
        }
        Returns: undefined
      }
      apply_icare_delta: {
        Args: { p_delta: number; p_item_code: string; p_warehouse: string }
        Returns: undefined
      }
      apply_legacy_layer_delta: {
        Args: {
          p_date: string
          p_delta: number
          p_doc_num: string
          p_item_code: string
          p_warehouse: string
        }
        Returns: undefined
      }
      approve_item_request: {
        Args: {
          p_category?: string
          p_name?: string
          p_request_id: string
          p_unit?: string
        }
        Returns: Json
      }
      azp_can_read: { Args: never; Returns: boolean }
      azp_cancel_movement: {
        Args: { p_id: number; p_module: string; p_reason?: string }
        Returns: undefined
      }
      azp_check_module: { Args: { p_module: string }; Returns: string }
      azp_correct_movement: {
        Args: {
          p_id: number
          p_module: string
          p_patch: Json
          p_reason?: string
        }
        Returns: number
      }
      azp_delete_card: {
        Args: { p_card_id: string; p_module: string }
        Returns: undefined
      }
      azp_is_admin: { Args: never; Returns: boolean }
      azp_post_movements: {
        Args: { p_module: string; p_rows: Json; p_source?: string }
        Returns: number
      }
      azp_save_card: {
        Args: { p_card: Json; p_module: string }
        Returns: string
      }
      azp_set_application_balance: {
        Args: { p_balance: number; p_module: string }
        Returns: number
      }
      azp_user_role: { Args: never; Returns: string }
      backfill_exact_receipt_layers: {
        Args: {
          p_expected_eligible_layer_count: number
          p_expected_max_created_at: string
          p_expected_movement_count: number
        }
        Returns: Json
      }
      cancel_document: {
        Args: { p_doc_num: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_documents_batch: {
        Args: { p_doc_nums: string[]; p_reversal_date?: string }
        Returns: Json
      }
      cancel_item_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: Json
      }
      cancel_layer_document: {
        Args: { p_doc_num: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_layer_documents_batch: {
        Args: { p_doc_nums: string[]; p_reversal_date?: string }
        Returns: Json
      }
      cancel_layer_legacy_movement: {
        Args: { p_movement_id: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_layer_legacy_transfer: {
        Args: { p_movement_id: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_layer_movement_row: {
        Args: { p_movement_id: string; p_reason: string }
        Returns: Json
      }
      cancel_layer_transfer_document: {
        Args: { p_doc_num: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_legacy_movement: {
        Args: { p_movement_id: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_legacy_transfer: {
        Args: { p_movement_id: string; p_reversal_date?: string }
        Returns: Json
      }
      cancel_movement_row: {
        Args: { p_movement_id: string; p_reason?: string }
        Returns: Json
      }
      cancel_transfer_document: {
        Args: { p_original_doc_num: string; p_reversal_date?: string }
        Returns: Json
      }
      correct_document: {
        Args: {
          p_doc_num: string
          p_lines: Json
          p_reason: string
          p_reversal_date?: string
        }
        Returns: Json
      }
      create_serfiyyat_document: {
        Args: {
          p_alinma_kanali?: string
          p_avtomobil_nomresi?: string
          p_doc_date: string
          p_invoice_num?: string
          p_kontragent?: string
          p_lines?: Json
          p_note?: string
          p_project_id: string
        }
        Returns: Json
      }
      current_user_role: { Args: never; Returns: string }
      current_user_warehouse: { Args: never; Returns: string }
      delete_serfiyyat_document: { Args: { p_doc_id: string }; Returns: Json }
      document_edit_impact: { Args: { p_doc_num: string }; Returns: Json }
      edit_serfiyyat_document: {
        Args: {
          p_alinma_kanali?: string
          p_avtomobil_nomresi?: string
          p_doc_date: string
          p_doc_id: string
          p_invoice_num?: string
          p_kontragent?: string
          p_lines?: Json
          p_note?: string
          p_project_id: string
        }
        Returns: Json
      }
      effective_role: { Args: { p_role: string }; Returns: string }
      end_other_sessions: { Args: { p_keep_device_id: string }; Returns: Json }
      end_session: { Args: { p_device_id: string }; Returns: Json }
      get_reference_values: {
        Args: never
        Returns: {
          active: boolean
          id: string
          kind: string
          name: string
        }[]
      }
      get_stock_layers: {
        Args: { p_item_code: string; p_warehouse: string }
        Returns: Json
      }
      get_transfer_destinations: { Args: never; Returns: string[] }
      get_user_directory: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      icare_exposure: {
        Args: { p_item_code: string; p_out_qty: number; p_warehouse: string }
        Returns: number
      }
      import_new_items: { Args: { p_items: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_anbardar: { Args: never; Returns: boolean }
      is_rehber: { Args: never; Returns: boolean }
      item_request_candidates: { Args: { p_name: string }; Returns: Json }
      item_request_norm: { Args: { p_name: string }; Returns: string }
      legacy_transfer_strip_suffix: {
        Args: { p_partner: string }
        Returns: string
      }
      list_my_sessions: { Args: never; Returns: Json }
      lock_reference_labels: {
        Args: { p_names: string[]; p_prefix: string }
        Returns: undefined
      }
      log_icare_exposure: {
        Args: {
          p_doc_num: string
          p_item_code: string
          p_note: string
          p_out_qty: number
          p_type: string
          p_warehouse: string
        }
        Returns: undefined
      }
      manage_reference: {
        Args: {
          p_action: string
          p_id?: string
          p_kind: string
          p_meta?: Json
          p_name?: string
        }
        Returns: Json
      }
      manage_reference_uuid_internal: {
        Args: {
          p_action: string
          p_id?: string
          p_kind: string
          p_meta?: Json
          p_name?: string
        }
        Returns: Json
      }
      movement_split_supported: { Args: never; Returns: boolean }
      my_role: { Args: never; Returns: string }
      my_warehouse: { Args: never; Returns: string }
      next_serfiyyat_doc_num: { Args: never; Returns: string }
      nom_norm: { Args: { p_name: string }; Returns: string }
      post_layer_movement_document: {
        Args: { p_doc_num?: string; p_lines: Json; p_request_key: string }
        Returns: Json
      }
      post_layer_transfer_document: {
        Args: { p_doc_num?: string; p_lines: Json; p_request_key: string }
        Returns: Json
      }
      post_movement_document: {
        Args: { p_doc_num?: string; p_lines: Json }
        Returns: Json
      }
      post_transfer_document: {
        Args: { p_doc_num?: string; p_lines: Json }
        Returns: Json
      }
      register_session: {
        Args: { p_device_id: string; p_device_label?: string }
        Returns: Json
      }
      reject_item_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      replace_movement_item: {
        Args: {
          p_movement_id: string
          p_new_item_code: string
          p_reason?: string
        }
        Returns: Json
      }
      request_new_item: {
        Args: {
          p_category?: string
          p_name: string
          p_note?: string
          p_unit?: string
        }
        Returns: Json
      }
      session_device_limit: { Args: { p_role: string }; Returns: number }
      session_stale_cutoff: { Args: never; Returns: string }
      set_item_categories: { Args: { p_mappings: Json }; Returns: Json }
      set_stock_condition: {
        Args: {
          p_icare_qty?: number
          p_item_code: string
          p_note?: string
          p_onsite_qty?: number
          p_repair_qty?: number
          p_unfit_qty?: number
          p_warehouse: string
        }
        Returns: Json
      }
      stock_condition_balance: {
        Args: { p_item_code: string; p_warehouse: string }
        Returns: number
      }
      stock_layer_revision: {
        Args: { p_item_code: string; p_warehouse: string }
        Returns: string
      }
      stock_layers_supported: { Args: never; Returns: Json }
      touch_session: { Args: { p_device_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
