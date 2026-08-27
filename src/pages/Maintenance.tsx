import { maintenanceApi } from '../api/client'
import { WorkLog } from '../components/WorkLog'

export function Maintenance() {
  return (
    <WorkLog
      title="Maintenance"
      workLabel="What was done"
      api={maintenanceApi}
    />
  )
}
