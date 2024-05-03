export default function FormContainer({ children }: any) {
  return (
    <div class="rounded bg-gradient-to-b from-cosplay-blue-100 to-cosplay-purple p-px">
      <div class="flex w-full flex-col rounded bg-gray-900 p-10 text-white">{children}</div>
    </div>
  )
}
