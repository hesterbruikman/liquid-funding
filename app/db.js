import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

import schema from './model/schema'
import LpEvent from './model/lpEvents'
import VaultEvent from './model/vaultEvent'
import Profile from './model/profile'
import Pledge from './model/pledge'

const dbName = 'LiquidFunding'
const adapter = new LokiJSAdapter({
  dbName,
  schema,
})

const database = new Database({
  adapter,
  modelClasses: [
    LpEvent,
    VaultEvent,
    Profile,
    Pledge
  ],
  actionsEnabled: true,
})

export default database
