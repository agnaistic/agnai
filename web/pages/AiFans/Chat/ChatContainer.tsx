const ChatContainer = (props: any) => {
  return (
    <div class="flex w-full flex-grow flex-col flex-wrap sm:flex-row sm:flex-nowrap">
      {/*<!-- fixed-width -->*/}
      <div class="w-fixed flex-shrink flex-grow-0 px-4 sm:flex-shrink sm:flex-grow-0 sm:basis-96">
        <div class="sticky top-0 h-full w-full p-4">
          {/*<!-- nav goes here -->*/}
          sidebar left
        </div>
      </div>
      <main role="main" class="h-screen w-full flex-grow px-3 pt-1">
        {/*<!-- fluid-width: main content goes here -->*/}
        {props.children}
      </main>
      <div class="w-fixed flex-shrink flex-grow-0 px-4 sm:flex-shrink sm:flex-grow-0 sm:basis-96">
        {/*<!-- fixed-width -->*/}
        <div class="flex px-2 sm:flex-col">{/*<!-- sidebar goes here -->*/} sidebar right</div>
      </div>
    </div>
  )
}

export default ChatContainer
