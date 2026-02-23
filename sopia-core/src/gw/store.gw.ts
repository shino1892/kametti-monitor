import type { ApiHttpClient } from '../client/http.client'
import { InventoryItem } from '../struct/store.struct'

export class StoreGateway {
  constructor(private http: ApiHttpClient) {}

  getInventory(userType: 'DJ' | 'LISTENER', permanenceType: string, envelope: boolean) {
    return this.http.request(
      '/store/inventory-items',
      {
        method: 'GET',
        params: {
          usable_user_type: userType,
          permanence_type: permanenceType,
          envelope
        }
      },
      InventoryItem
    )
  }
}
