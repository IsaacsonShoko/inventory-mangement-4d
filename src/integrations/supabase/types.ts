export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bot_usage_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          user_role: string | null
          user_company: string | null
          user_warehouse: string | null
          session_id: string
          query: string
          response: string
          sources: Json | null
          tokens_used: number | null
          response_time_ms: number | null
          is_work_related: boolean | null
          satisfaction_rating: number | null
          satisfaction_feedback: string | null
          created_at: string | null
          rated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          user_company?: string | null
          user_warehouse?: string | null
          session_id: string
          query: string
          response: string
          sources?: Json | null
          tokens_used?: number | null
          response_time_ms?: number | null
          is_work_related?: boolean | null
          satisfaction_rating?: number | null
          satisfaction_feedback?: string | null
          created_at?: string | null
          rated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          user_company?: string | null
          user_warehouse?: string | null
          session_id?: string
          query?: string
          response?: string
          sources?: Json | null
          tokens_used?: number | null
          response_time_ms?: number | null
          is_work_related?: boolean | null
          satisfaction_rating?: number | null
          satisfaction_feedback?: string | null
          created_at?: string | null
          rated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      device_movements: {
        Row: {
          id: string
          device_id: string
          movement_type: string
          movement_date: string
          from_holder_type: string | null
          from_holder_id: string | null
          to_holder_type: string | null
          to_holder_id: string | null
          performed_by: string
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          device_id: string
          movement_type: string
          movement_date?: string
          from_holder_type?: string | null
          from_holder_id?: string | null
          to_holder_type?: string | null
          to_holder_id?: string | null
          performed_by: string
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          device_id?: string
          movement_type?: string
          movement_date?: string
          from_holder_type?: string | null
          from_holder_id?: string | null
          to_holder_type?: string | null
          to_holder_id?: string | null
          performed_by?: string
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_movements_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_registry"
            referencedColumns: ["id"]
          }
        ]
      }
      device_registry: {
        Row: {
          id: string
          serial_number: string
          device_type: string
          item_category: string
          item_nature: string
          item_code: string | null
          item_description: string | null
          status: string
          current_holder_type: string | null
          current_holder_id: string | null
          cradle_serial_number: string | null
          charger_serial_number: string | null
          qr_code_serial_number: string | null
          date_acquired: string | null
          warranty_expiry: string | null
          last_verified_date: string | null
          last_maintenance_date: string | null
          supplier: string | null
          purchase_order_number: string | null
          ingestion_batch_id: string | null
          overall_condition: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          serial_number: string
          device_type: string
          item_category: string
          item_nature?: string
          item_code?: string | null
          item_description?: string | null
          status?: string
          current_holder_type?: string | null
          current_holder_id?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          qr_code_serial_number?: string | null
          date_acquired?: string | null
          warranty_expiry?: string | null
          last_verified_date?: string | null
          last_maintenance_date?: string | null
          supplier?: string | null
          purchase_order_number?: string | null
          ingestion_batch_id?: string | null
          overall_condition?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          serial_number?: string
          device_type?: string
          item_category?: string
          item_nature?: string
          item_code?: string | null
          item_description?: string | null
          status?: string
          current_holder_type?: string | null
          current_holder_id?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          qr_code_serial_number?: string | null
          date_acquired?: string | null
          warranty_expiry?: string | null
          last_verified_date?: string | null
          last_maintenance_date?: string | null
          supplier?: string | null
          purchase_order_number?: string | null
          ingestion_batch_id?: string | null
          overall_condition?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_registry_ingestion_batch_id_fkey"
            columns: ["ingestion_batch_id"]
            isOneToOne: false
            referencedRelation: "ingestion_batches"
            referencedColumns: ["id"]
          }
        ]
      }
      dispatch_log: {
        Row: {
          id: number
          order_id: number | null
          unique_order_record_id: number | null
          stock_order_id: number | null
          date_dispatched: string
          item_category: string | null
          item_nature: string | null
          item_description: string | null
          device_type: string | null
          quantity: number | null
          contractor_company: string | null
          region: string | null
          technician: string | null
          warehouse_fulfilling: string | null
          terminal_serial_number: string | null
          cradle_serial_number: string | null
          charger_serial_number: string | null
          cashconnect_serial_number: string | null
          charger_packed: string | null
          cables: string | null
          packer: string | null
          dispatcher: string | null
          dispatch_method: string | null
          waybill_number: string | null
          package_reference: string | null
          stock_availability: string | null
          pick_status: string | null
          shipped: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          order_id?: number | null
          unique_order_record_id?: number | null
          stock_order_id?: number | null
          date_dispatched: string
          item_category?: string | null
          item_nature?: string | null
          item_description?: string | null
          device_type?: string | null
          quantity?: number | null
          contractor_company?: string | null
          region?: string | null
          technician?: string | null
          warehouse_fulfilling?: string | null
          terminal_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          cashconnect_serial_number?: string | null
          charger_packed?: string | null
          cables?: string | null
          packer?: string | null
          dispatcher?: string | null
          dispatch_method?: string | null
          waybill_number?: string | null
          package_reference?: string | null
          stock_availability?: string | null
          pick_status?: string | null
          shipped?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          order_id?: number | null
          unique_order_record_id?: number | null
          stock_order_id?: number | null
          date_dispatched?: string
          item_category?: string | null
          item_nature?: string | null
          item_description?: string | null
          device_type?: string | null
          quantity?: number | null
          contractor_company?: string | null
          region?: string | null
          technician?: string | null
          warehouse_fulfilling?: string | null
          terminal_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          cashconnect_serial_number?: string | null
          charger_packed?: string | null
          cables?: string | null
          packer?: string | null
          dispatcher?: string | null
          dispatch_method?: string | null
          waybill_number?: string | null
          package_reference?: string | null
          stock_availability?: string | null
          pick_status?: string | null
          shipped?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingestion_batches: {
        Row: {
          id: string
          batch_number: number
          receiving_warehouse: string
          supplier: string | null
          date_received: string
          purchase_order_number: string | null
          notes: string | null
          total_devices: number
          successful_count: number
          failed_count: number
          ingested_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_number?: number
          receiving_warehouse: string
          supplier?: string | null
          date_received: string
          purchase_order_number?: string | null
          notes?: string | null
          total_devices: number
          successful_count?: number
          failed_count?: number
          ingested_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_number?: number
          receiving_warehouse?: string
          supplier?: string | null
          date_received?: string
          purchase_order_number?: string | null
          notes?: string | null
          total_devices?: number
          successful_count?: number
          failed_count?: number
          ingested_by?: string
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: number
          item_name: string
          item_url: string | null
          item_category: string | null
          item_description: string | null
          item_nature: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          item_name: string
          item_url?: string | null
          item_category?: string | null
          item_description?: string | null
          item_nature?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          item_name?: string
          item_url?: string | null
          item_category?: string | null
          item_description?: string | null
          item_nature?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      point_of_presence: {
        Row: {
          id: number
          tech_id: string | null
          name_surname: string
          contractor: string | null
          region: string | null
          email_address: string | null
          contact_number: string | null
          mobile: string | null
          area_based: string | null
          location_code: string | null
          physical_address: string | null
          latitude: number | null
          longitude: number | null
          tech_id_no: string | null
          mie_date: string | null
          absa_bin_created_date: string | null
          absa_xlink_pop: string | null
          absa_training_completed: string | null
          ad: string | null
          systems: string | null
          wiki_updated: string | null
          poly_graph_date: string | null
          cc_training_start_date: string | null
          cc_training_end_date: string | null
          cc_ride_along_completed: string | null
          mrm: string | null
          sap: string | null
          safe_control_skipper_app: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          tech_id?: string | null
          name_surname: string
          contractor?: string | null
          region?: string | null
          email_address?: string | null
          contact_number?: string | null
          mobile?: string | null
          area_based?: string | null
          location_code?: string | null
          physical_address?: string | null
          latitude?: number | null
          longitude?: number | null
          tech_id_no?: string | null
          mie_date?: string | null
          absa_bin_created_date?: string | null
          absa_xlink_pop?: string | null
          absa_training_completed?: string | null
          ad?: string | null
          systems?: string | null
          wiki_updated?: string | null
          poly_graph_date?: string | null
          cc_training_start_date?: string | null
          cc_training_end_date?: string | null
          cc_ride_along_completed?: string | null
          mrm?: string | null
          sap?: string | null
          safe_control_skipper_app?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          tech_id?: string | null
          name_surname?: string
          contractor?: string | null
          region?: string | null
          email_address?: string | null
          contact_number?: string | null
          mobile?: string | null
          area_based?: string | null
          location_code?: string | null
          physical_address?: string | null
          latitude?: number | null
          longitude?: number | null
          tech_id_no?: string | null
          mie_date?: string | null
          absa_bin_created_date?: string | null
          absa_xlink_pop?: string | null
          absa_training_completed?: string | null
          ad?: string | null
          systems?: string | null
          wiki_updated?: string | null
          poly_graph_date?: string | null
          cc_training_start_date?: string | null
          cc_training_end_date?: string | null
          cc_ride_along_completed?: string | null
          mrm?: string | null
          sap?: string | null
          safe_control_skipper_app?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repair_tickets: {
        Row: {
          id: string
          ticket_number: number
          device_id: string
          reported_by: string
          reported_date: string
          fault_category: string
          fault_description: string | null
          fault_severity: string | null
          fault_images: string[] | null
          assessed_by: string | null
          assessment_date: string | null
          assessment_notes: string | null
          is_repairable: boolean | null
          estimated_repair_hours: number | null
          repaired_by: string | null
          repair_start_date: string | null
          repair_end_date: string | null
          repair_actions: string | null
          parts_used: string | null
          repair_cost: number | null
          quality_checked_by: string | null
          quality_check_date: string | null
          quality_check_passed: boolean | null
          quality_check_notes: string | null
          status: string
          returned_to_stock_date: string | null
          returned_to_warehouse: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ticket_number?: number
          device_id: string
          reported_by: string
          reported_date?: string
          fault_category: string
          fault_description?: string | null
          fault_severity?: string | null
          fault_images?: string[] | null
          assessed_by?: string | null
          assessment_date?: string | null
          assessment_notes?: string | null
          is_repairable?: boolean | null
          estimated_repair_hours?: number | null
          repaired_by?: string | null
          repair_start_date?: string | null
          repair_end_date?: string | null
          repair_actions?: string | null
          parts_used?: string | null
          repair_cost?: number | null
          quality_checked_by?: string | null
          quality_check_date?: string | null
          quality_check_passed?: boolean | null
          quality_check_notes?: string | null
          status?: string
          returned_to_stock_date?: string | null
          returned_to_warehouse?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ticket_number?: number
          device_id?: string
          reported_by?: string
          reported_date?: string
          fault_category?: string
          fault_description?: string | null
          fault_severity?: string | null
          fault_images?: string[] | null
          assessed_by?: string | null
          assessment_date?: string | null
          assessment_notes?: string | null
          is_repairable?: boolean | null
          estimated_repair_hours?: number | null
          repaired_by?: string | null
          repair_start_date?: string | null
          repair_end_date?: string | null
          repair_actions?: string | null
          parts_used?: string | null
          repair_cost?: number | null
          quality_checked_by?: string | null
          quality_check_date?: string | null
          quality_check_passed?: boolean | null
          quality_check_notes?: string | null
          status?: string
          returned_to_stock_date?: string | null
          returned_to_warehouse?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_tickets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_registry"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_counts: {
        Row: {
          id: string
          count_type: string
          stock_holder: string
          region: string | null
          count_date: string
          device_type: string
          quantity: number
          manufacture_serial_number: string | null
          qr_code_serial_number: string | null
          xlink_serial_number: string | null
          cradle_serial_number: string | null
          charger_serial_number: string | null
          item_status: string | null
          fault_reason: string | null
          overall_condition: string | null
          counted_by: string
          business_line: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          count_type: string
          stock_holder: string
          region?: string | null
          count_date: string
          device_type: string
          quantity: number
          manufacture_serial_number?: string | null
          qr_code_serial_number?: string | null
          xlink_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          item_status?: string | null
          fault_reason?: string | null
          overall_condition?: string | null
          counted_by: string
          business_line?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          count_type?: string
          stock_holder?: string
          region?: string | null
          count_date?: string
          device_type?: string
          quantity?: number
          manufacture_serial_number?: string | null
          qr_code_serial_number?: string | null
          xlink_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          item_status?: string | null
          fault_reason?: string | null
          overall_condition?: string | null
          counted_by?: string
          business_line?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_levels: {
        Row: {
          id: string
          device_type: string
          item_category: string | null
          item_nature: string | null
          item_code: string | null
          item_description: string | null
          quantity: number | null
          quantity_on_hand: number | null
          quantity_allocated: number | null
          quantity_available: number | null
          reorder_point: number | null
          location: string | null
          bin_location: string | null
          stock_holder: string | null
          name_or_location: string | null
          contractor_company: string | null
          contractor_region: string | null
          technician_name: string | null
          tech_id: string | null
          item_status: string | null
          fault_reason: string | null
          overall_condition: string | null
          xli_case_ref: string | null
          count_type: string | null
          count_id: string | null
          user_email: string | null
          count_period: string | null
          manufacture_serial_number: string | null
          qr_code_serial_number: string | null
          xlink_serial_number: string | null
          cradle_serial_number: string | null
          charger_serial_number: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          device_type: string
          item_category?: string | null
          item_nature?: string | null
          item_code?: string | null
          item_description?: string | null
          quantity?: number | null
          quantity_on_hand?: number | null
          quantity_allocated?: number | null
          quantity_available?: number | null
          reorder_point?: number | null
          location?: string | null
          bin_location?: string | null
          stock_holder?: string | null
          name_or_location?: string | null
          contractor_company?: string | null
          contractor_region?: string | null
          technician_name?: string | null
          tech_id?: string | null
          item_status?: string | null
          fault_reason?: string | null
          overall_condition?: string | null
          xli_case_ref?: string | null
          count_type?: string | null
          count_id?: string | null
          user_email?: string | null
          count_period?: string | null
          manufacture_serial_number?: string | null
          qr_code_serial_number?: string | null
          xlink_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          device_type?: string
          item_category?: string | null
          item_nature?: string | null
          item_code?: string | null
          item_description?: string | null
          quantity?: number | null
          quantity_on_hand?: number | null
          quantity_allocated?: number | null
          quantity_available?: number | null
          reorder_point?: number | null
          location?: string | null
          bin_location?: string | null
          stock_holder?: string | null
          name_or_location?: string | null
          contractor_company?: string | null
          contractor_region?: string | null
          technician_name?: string | null
          tech_id?: string | null
          item_status?: string | null
          fault_reason?: string | null
          overall_condition?: string | null
          xli_case_ref?: string | null
          count_type?: string | null
          count_id?: string | null
          user_email?: string | null
          count_period?: string | null
          manufacture_serial_number?: string | null
          qr_code_serial_number?: string | null
          xlink_serial_number?: string | null
          cradle_serial_number?: string | null
          charger_serial_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          company: string | null
          role: string
          approval_status: string
          approved_by: string | null
          approved_at: string | null
          warehouse: string | null
          is_guest: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          role: string
          approval_status: string
          approved_by?: string | null
          approved_at?: string | null
          warehouse?: string | null
          is_guest?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          role?: string
          approval_status?: string
          approved_by?: string | null
          approved_at?: string | null
          warehouse?: string | null
          is_guest?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Enums: {
      device_status_enum: "Available" | "Installed" | "Faulty" | "In-Repair" | "Decommissioned" | "Unverified" | "Missing"
      holder_type_enum: "Warehouse" | "Technician" | "Vendor"
      movement_type_enum: "Ingestion" | "Dispatch" | "Installation" | "Removal" | "Repair-In" | "Repair-Out" | "Transfer" | "Return" | "Decommission"
      fault_category_enum: "Dead On Arrival" | "Screen Damaged" | "Cradle/Charger Damaged" | "Enclosure Damaged" | "Port/Connector Damaged" | "Battery Failure" | "Printer Malfunction" | "Card Reader Failure" | "Keypad Malfunction" | "Speaker/Mic Failure" | "Software Error" | "Connectivity Issues" | "Firmware Corruption" | "SIM/Network Failure" | "Water Damage" | "Heat Damage" | "Theft/Tampering" | "Unknown" | "Other"
      repair_status_enum: "Reported" | "Assessing" | "In-Repair" | "Repaired" | "Quality-Check" | "Returned" | "Decommissioned"
      business_line_enum: "Accessories" | "Absa" | "Cash Connect" | "Modems" | "Sim Management" | "VPS" | "Other"
      item_nature_enum: "Serialised" | "Non-serialised"
      dispatch_method_enum: "Courier" | "Collection" | "Internal Transfer"
    }
  }
}
