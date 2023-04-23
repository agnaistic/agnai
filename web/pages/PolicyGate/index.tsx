import { A } from '@solidjs/router'
import {Component, createSignal} from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { adaptersToOptions } from '../../shared/util'
import { settingStore } from '../../store'
import NavBar from "../../shared/NavBar";
import Navigation from "../../Navigation";
import Toasts from "../../Toasts";
import Modal from "../../shared/Modal";
import TermsOfService from "../TermsOfService";
import PrivacyPolicy from "../PrivacyPolicy";
import Button from "../../shared/Button";

const PolicyGate: Component = () => {
  const [showTermsOfService, setShowTermsOfService] = createSignal(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = createSignal(false)
  const [isPolicyAccepted, setIsPolicyAccepted] = createSignal(false)
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
        <div class="max-w-[30rem] min-w-[3rem] flex flex-row justify-around">
          <Button onClick={() => setShowTermsOfService(true)}>Read Terms of Service</Button>
          <Button onClick={() => setShowPrivacyPolicy(true)}>Read Privacy Policy</Button>
        </div>
        <Modal maxWidth="full" close={() => setShowTermsOfService(false)} show={showTermsOfService()}>
          <TermsOfService/>
        </Modal>
        <Modal maxWidth="full" close={() => setShowPrivacyPolicy(false)} show={showPrivacyPolicy()}>
          <PrivacyPolicy/>
        </Modal>
        <div>
          <label><input class="inline-block mx-2" type="checkbox" id="policy-check" onChange={(event) => setIsPolicyAccepted(event.currentTarget.checked)} />Check here to agree to our Terms of Service and Privacy Policy</label>
        </div>
        <div class="max-w-[30rem] min-w-[3rem] flex flex-row justify-around">
          <Button disabled={!isPolicyAccepted()}>18 years old or older? Click Here!</Button>
          <Button disabled={!isPolicyAccepted()}>Not 18? Click Here!</Button>
        </div>
      </div>
    </div>
  )
}
export default PolicyGate
