import { Plus } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import { memoryStore } from '../../store/memory'
import Accordian from '../Accordian'
import Button from '../Button'
import Modal from '../Modal'

const EditMemoryBook: Component<{ book: AppSchema.MemoryBook }> = (props) => {
  const state = memoryStore()
  const [open, setOpen] = createSignal(0)

  const onEntryClick = (index: number) => {
    const curr = open()
    if (index === curr) setOpen(-1)
    else setOpen(index)
  }

  const Footer = () => (
    <>
      <Button>
        <Plus />
        Entry
      </Button>
    </>
  )

  return (
    <Modal
      maxWidth="full"
      title="Memory Library"
      show={state.show}
      close={() => memoryStore.toggle(false)}
      footer={<Footer />}
    >
      <div class="min-h-[50vh]">
        <div class="flex w-full">{props.book.name}</div>
        <Accordian title="Entry" show={open() === 0} onClick={() => onEntryClick(0)}>
          Testing entry
        </Accordian>
      </div>
    </Modal>
  )
}

export default EditMemoryBook
