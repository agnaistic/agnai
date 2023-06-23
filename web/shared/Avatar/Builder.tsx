import styles from './avatar.module.scss'

import { Component } from 'solid-js'
import PageHeader from '../PageHeader'

console.log(styles)

const Builder: Component = (props) => {
  return (
    <>
      <PageHeader title="Character Builder" />
      <div class="flex w-full justify-center">
        <main class={styles.main}>
          <header class={styles.header}>Character builder</header>
          <section class={styles.left}>Left</section>

          <section class={styles.preview}>Preview</section>

          <section class={styles.right}>Right</section>
          <footer class={styles.footer}>Footer</footer>
        </main>
      </div>
    </>
  )
}

export default Builder
