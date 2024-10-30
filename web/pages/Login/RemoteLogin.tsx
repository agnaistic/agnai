// import { useSearchParams } from '@solidjs/router'
// import { Component, Match, Switch, createSignal } from 'solid-js'
// import Button from '/web/shared/Button'
// import { userStore } from '/web/store'
// import { TitleCard } from '/web/shared/Card'

// export const RemoteLogin: Component = (props) => {
//   const user = userStore()
//   const [query] = useSearchParams()
//   const [error, setError] = createSignal<string>()
//   const [state, setState] = createSignal<'init' | 'creating' | 'done'>('init')

//   const createCode = async () => {
//     setState('creating')
//     userStore.remoteLogin((err, code) => {
//       setState('done')

//       if (err) {
//         setError(err)
//         return
//       }

//       if (code) {
//         location.href = `${query.callback}?code=${code}`
//       }
//     })
//   }

//   return (
//     <div class="mx-auto flex w-[320px] flex-col items-center gap-4 text-sm">
//       <Switch>
//         <Match when={!user.user}>
//           <TitleCard type="rose" class="w-full">
//             Error - You are not currently logged in.
//           </TitleCard>
//         </Match>
//         <Match when={!query.callback}>
//           <TitleCard type="rose" class="w-full">
//             Missing <code>callback</code> from query parameters.
//           </TitleCard>
//         </Match>

//         <Match when={error()}>Failed: {error()}</Match>

//         <Match when>
//           <TitleCard type="orange" class="w-full">
//             An application is requesting to access your Agnaistic account on your behalf
//           </TitleCard>

//           <TitleCard class="markdown w-full">
//             <p>The application will be able to access your:</p>
//             <p>Profile name, Avatar, Characters, and Presets.</p>

//             <p></p>
//           </TitleCard>
//         </Match>
//       </Switch>

//       <Switch>
//         <Match when={state() === 'init'}>
//           <Button onClick={createCode}>Authorize</Button>
//         </Match>

//         <Match when={state() === 'creating'}>
//           <Button disabled>Authorizing...</Button>
//         </Match>

//         <Match when>
//           <Button disabled>Authorize</Button>
//         </Match>
//       </Switch>
//     </div>
//   )
// }

// export default OAuthLogin
