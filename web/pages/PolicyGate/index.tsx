import { A } from '@solidjs/router'
import {Component, createSignal} from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions } from '../../shared/util'
import { settingStore } from '../../store'
import NavBar from "../../shared/NavBar";
import Navigation from "../../Navigation";
import Toasts from "../../Toasts";
import Modal from "../../shared/Modal";

const PolicyGate: Component = () => {
  const [showTermsOfService, setShowTermsOfService] = createSignal('')
  const [showPrivacyPolicy, setShowPrivacyPolicy] = createSignal('')
  return (
    <div>
      <PageHeader
        title={
          <div class="w-fit items-center justify-center rounded-lg text-2xl">
            Agn<span class="font-bold text-[var(--hl-500)]">ai</span>stic
          </div>
        }
      />
      <div class="flex flex-col gap-4">
        <p>Before you can proceed, you must verify your age and agree to our Terms of Service and Privacy Policy.</p>
        <div class="max-w-[20rem] min-w-[3rem] flex flex-row justify-around">
          <div>Terms of Service</div>
          <div>Privacy Policy</div>
        </div>
        <Modal close={() => setShowTermsOfService('')} show={!!showTermsOfService()}>
          <TermsOfService/>
        </Modal>
        <Modal close={() => setShowPrivacyPolicy('')} show={!!showPrivacyPolicy()}>
          <PrivacyPolicy/>
        </Modal>
        <div>
          <label><input class="inline-block mx-2" type="checkbox" id="policy-check" />Check here to agree to our Terms of Service and Privacy Policy</label>
        </div>
        <div class="flex-col justify-around">
          <div>18 years old or older? Click Here!</div>
          <div>Not 18? Click Here!</div>
        </div>
      </div>
    </div>
  )
}
export default PolicyGate
