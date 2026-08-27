import { cleaningApi } from '../api/client'
import { WorkLog } from '../components/WorkLog'

export function Cleaning() {
  return (
    <WorkLog
      title="Cleaning"
      workLabel="What was cleaned"
      api={cleaningApi}
    />
  )
}
