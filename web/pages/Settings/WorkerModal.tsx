import { Save, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import { HordeWorker } from '../../../common/adapters'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import MultiDropdown from '../../shared/MultiDropdown'
import { settingStore, userStore } from '../../store'
import { Option } from '../../shared/Select'
import { useTransContext } from '@mbarzda/solid-i18next'

const WorkerModal: Component<{
  show: boolean
  close: () => void
  save: (items: Option[]) => void
}> = (props) => {
  const [t] = useTransContext()

  const cfg = settingStore((s) => ({
    workers: s.workers.slice().sort(sortWorkers).map(toWorkerItem),
  }))

  const state = userStore()

  const [selected, setSelected] = createSignal<Option[]>()

  const save = () => {
    if (selected()) {
      props.save(selected()!)
    } else if (state.user?.hordeWorkers) {
      props.save(cfg.workers.filter((w) => state.user?.hordeWorkers!.includes(w.value)))
    }

    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={t('specify_ai_horde_workers')}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> {t('cancel')}
          </Button>
          <Button onClick={save}>
            <Save /> {t('select_workers')}
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-4 text-sm">
        <MultiDropdown
          fieldName="workers"
          items={cfg.workers}
          label={t('select_workers')}
          helperText={t('to_use_any_worker_deselect_all_workers')}
          onChange={setSelected}
          values={selected()?.map((s) => s.value) || state.user?.hordeWorkers || []}
        />
        <div class="flex items-center justify-between gap-4">
          <div>
            {t('workers_selected_x', {
              workers: selected()?.length || state.user?.hordeWorkers?.length || '0',
            })}
          </div>
          <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
            {t('deselect_all')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default WorkerModal

function sortWorkers({ models: l }: HordeWorker, { models: r }: HordeWorker) {
  return l[0] > r[0] ? 1 : l[0] === r[0] ? 0 : -1
}

function toWorkerItem(wkr: HordeWorker): Option {
  return { label: `${wkr.name} - ${wkr.models[0]}`, value: wkr.id }
}
