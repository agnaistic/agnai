import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { markdown } from '../../shared/markdown'
import { Page } from '/web/Layout'

const text = `
**Dated September 27, 2023**

## Thank you for using Agnaistic!

Agnaistic (hereafter known as the Stakeholders) provide Services to you subject to these terms.

These Terms of Use apply when you use the Services of the Stakeholders, or our affiliates, including our application programming interface (if any), software, tools, developer services, data, documentation, and websites ("Services"). The Terms include our Service Terms, Sharing & Publication Policy, Usage Policies, and other documentation, guidelines, or policies we may provide in writing. By using our Services, you agree to these Terms. Our Privacy Policy explains how we collect and use personal information.

## 1. Registration and Access

You must be at least 18 years old to use the Services. If you are found to be under 18, your access to the service will be restricted or revoked. If you use the Services on behalf of another person or entity, you must have the authority to accept the Terms on their behalf.

## 2. Usage Requirements

(a) Use of Services. You may access, and the Stakeholders grant you a non-exclusive right to use, the Services in accordance with these Terms. You will comply with these Terms and all applicable laws when using the Services, as well as the AGPL license associated with this service if you use the underlying code.
(b) Feedback. We appreciate feedback, comments, ideas, proposals and suggestions for improvements. If you provide any of these things, we may use it without restriction or compensation to you.
(c) Restrictions. You may not (i) use the Services in a way that infringes, misappropriates or violates any person's rights; (ii) represent that output from the Services was human-generated when it is not or otherwise violate our Usage Policies; (iii) use this service to illegally access or exploit other downstream services (including other LLM providers); (iv) you may not send us any personal information of children nor use our service to generate illegal content; (v) all uses of the Services must comply with local laws and regulations applicable in your jurisdiction; (vi) you may not use this service for any of the restricted use cases outlined in Attachment A ("Use Restrictions). You will comply with any rate limits and other requirements in our documentation. You will not attempt to bypass any security or safety controls or mechanisms on Services if present.
(d) Third Party Services. Any third party software, services, or other products you use in connection with the Services are subject to their own terms, and we are not responsible for third party products. This includes third party language models, generative tooling, and other systems which Services interface with.

## 3. Content

(a) Your Content. You may provide input to the Services ("Input"), and receive output generated and returned by the Services based on the Input ("Output"). Input and Output are collectively "Content." As between the parties and to the extent permitted by applicable law, you own all Input. Subject to your compliance with these Terms, the Stakeholders hereby assigns to you all its right, title and interest in and to Output. This means you can use Content for any purpose, including commercial purposes such as sale or publication, if you comply with these Terms. The Stakeholders may use Content to provide and maintain the Services, comply with applicable law, and enforce our policies. You are responsible for Content, including for ensuring that it does not violate any applicable law or these Terms.
(b) Similarity of Content. Due to the nature of machine learning, Output may not be unique across users and the Services may generate the same or similar output for the Stakeholders or a third party. For example, you may provide input to a model such as "What color is the sky?" and receive output such as "The sky is blue." Other users may also ask similar questions and receive the same response. Responses that are requested by and generated for other users are not considered your Content.
(c) Use of Content to Improve Services. We reserve the right to use Content from Services to help develop and improve our Services. All content is subject to our Privacy Policy.
(d) Accuracy. Artificial intelligence and machine learning are rapidly evolving fields of study. We are constantly working to improve our Services to make them more accurate, reliable, safe and beneficial. Given the probabilistic nature of machine learning, use of our Services may in some situations result in incorrect Output that does not accurately reflect real people, places, or facts. You should evaluate the accuracy of any Output as appropriate for your use case, including by using human review of the Output.
(e) Medical use. Artificial intelligence and machine learning are not qualified to provide medical advice or therapy. Stakeholders have taken reasonable measures to protect users; Stakeholders do not allow the use of Services for therapy or medical advice. Acceptance of these terms implies that you will use common sense and that you do not expect the content provided is superior to your own knowledge or the advice of medical professionals.

## 5. Fees and Payments

(a) Fees and Billing. The Stakeholders provide the majority of our Services to you at no charge.  In instances where Fees apply, you will pay all fees charged to your account (“Fees”) according to the prices and terms on the applicable pricing page, or as otherwise agreed between us in writing. We have the right to correct pricing errors or mistakes even if we have already issued an invoice or received payment. You will provide complete and accurate billing information including a valid and authorized payment method. We will charge your payment method on an agreed-upon periodic basis, but may reasonably change the date on which the charge is posted. You authorize Stakeholders and our affiliates, and our third-party payment processor(s), to charge your payment method for the Fees. If your payment cannot be completed, we will provide you written notice and may suspend access to the Services until payment is received. Fees are payable in U.S. dollars and are due upon invoice issuance. Payments are nonrefundable except as provided in this Agreement.
(b) Taxes. Unless otherwise stated, Fees do not include federal, state, local, and foreign taxes, duties, and other similar assessments (“Taxes”). You are responsible for all Taxes associated with your purchase, excluding Taxes based on our net income, and we may invoice you for such Taxes. You agree to timely pay such Taxes and provide us with documentation showing the payment, or additional evidence that we may reasonably require. Stakeholders use the name and address in your account registration as the place of supply for tax purposes, so you must keep this information accurate and up-to-date.
(c) Price Changes. We may change our prices by posting notice to your account and/or to our website. Price increases will be effective 14 days after they are posted, except for increases made for legal reasons or increases made to Beta Services (as defined in our Service Terms), which will be effective immediately. Any price changes will apply to the Fees charged to your account immediately after the effective date of the changes.
(d) Disputes and Late Payments. If you want to dispute any Fees or Taxes, please contact Agnastic within thirty (30) days of the date of the disputed invoice. Undisputed amounts past due may be subject to a finance charge of 1.5% of the unpaid balance per month. If any amount of your Fees are past due, we may suspend your access to the Services after we provide you written notice of late payment.
(e) Free Tier. You may not create more than one account to benefit from credits provided in the free tier of the Services. If we believe you are not using the free tier in good faith, we may charge you standard fees or stop providing access to the Services.

## 5. Confidentiality, Security and Data Protection

(a) Confidentiality. You may be given access to Confidential Information of Stakeholders, our affiliates and other third parties. You may use Confidential Information only as needed to use the Services as permitted under these Terms. You may not disclose Confidential Information to any third party, and you will protect Confidential Information in the same manner that you protect your own confidential information of a similar nature, using at least reasonable care. Confidential Information means nonpublic information that Stakeholders or our affiliates or third parties designate as confidential or should reasonably be considered confidential under the circumstances, including software, specifications, and other nonpublic business information. Confidential Information does not include information that: (i) is or becomes generally available to the public through no fault of yours; (ii) you already possess without any confidentiality obligations when you received it under these Terms; (iii) is rightfully disclosed to you by a third party without any confidentiality obligations; or (iv) you independently developed without using Confidential Information. You may disclose Confidential Information when required by law or the valid order of a court or other governmental authority if you give reasonable prior written notice to Stakeholders and use reasonable efforts to limit the scope of disclosure, including assisting us with challenging the disclosure requirement, in each case where possible.
(b) Security. You must implement reasonable and appropriate measures designed to help secure your access to and use of the Services. If you discover any vulnerabilities or breaches related to your use of the Services, you must promptly contact Stakeholders and provide details of the vulnerability or breach.
(c) Processing of Personal Data. If you use the Services to process personal data, you must provide legally adequate privacy notices and obtain necessary consents for the processing of such data, and you represent to us that you are processing such data in accordance with applicable law.

## 6. Term and Termination

(a) Termination; Suspension. These Terms take effect when you first use the Services and remain in effect until terminated. You may terminate these Terms at any time for any reason by discontinuing the use of the Services and Content. We may terminate these Terms for any reason by providing you at least 30 days' advance notice. We may terminate these Terms immediately upon notice to you if you materially breach Sections 2 (Usage Requirements), 4 (Confidentiality, Security and Data Protection), 7 (Dispute Resolution) or 8 (General Terms), if there are changes in relationships with third party technology providers outside of our control, or to comply with law or government requests. We may suspend your access to the Services if you do not comply with these Terms, if your use poses a security risk to us or any third party, or if we suspect that your use is fraudulent or could subject us or any third party to liability.
(b) Effect on Termination. Upon termination, you will stop using the Services and you will promptly return or, if instructed by us, destroy any Confidential Information. The sections of these Terms which by their nature should survive termination or expiration should survive, including but not limited to Sections 3 and 4-8.

## 7. Indemnification; Disclaimer of Warranties; Limitations on Liability 

(a) Indemnity. You will defend, indemnify, and hold harmless us, our affiliates, and our personnel, from and against any claims, losses, and expenses (including attorneys' fees) arising from or relating to your use of the Services, including your Content, products or services you develop or offer in connection with the Services, and your breach of these Terms or violation of applicable law.
(b) Disclaimer. THE SERVICES ARE PROVIDED "AS IS." EXCEPT TO THE EXTENT PROHIBITED BY LAW, WE AND OUR AFFILIATES AND LICENSORS MAKE NO WARRANTIES (EXPRESS, IMPLIED, STATUTORY OR OTHERWISE) WITH RESPECT TO THE SERVICES, AND DISCLAIM ALL WARRANTIES INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, SATISFACTORY QUALITY, NON-INFRINGEMENT, AND QUIET ENJOYMENT, AND ANY WARRANTIES ARISING OUT OF ANY COURSE OF DEALING OR TRADE USAGE. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ACCURATE OR ERROR FREE, OR THAT ANY CONTENT WILL BE SECURE OR NOT LOST OR ALTERED.
(c) Limitations of Liability. NEITHER WE NOR ANY OF OUR AFFILIATES OR LICENSORS WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR EXEMPLARY DAMAGES, INCLUDING DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, OR DATA OR OTHER LOSSES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID FOR THE SERVICE THAT GAVE RISE TO THE CLAIM DURING THE 12 MONTHS BEFORE THE LIABILITY AROSE OR ONE DOLLAR ($1 USD). THE LIMITATIONS IN THIS SECTION APPLY ONLY TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.

## 8. Dispute Resolution

YOU AGREE TO THE FOLLOWING MANDATORY ARBITRATION AND CLASS ACTION WAIVER PROVISIONS:

(a) Informal Dispute Resolution. We would like to understand and try to address your concerns prior to formal legal action. Before filing a claim against Stakeholders, you agree to try to resolve the dispute informally by sending us notice on our discord server (https://discord.agnai.chat) of your name, a description of the dispute, and the relief you seek. If we are unable to resolve a dispute within 60 days, you may bring a formal proceeding. Any statute of limitations will be tolled during the 60-day resolution process. If you reside in the EU, the European Commission provides for an online dispute resolution platform, which you can access at https://ec.europa.eu/consumers/odr.

## 9. General Terms

(a) Relationship of the Parties. These Terms do not create a partnership, joint venture or agency relationship between you and Stakeholders or any of Stakeholders' affiliates. Stakeholders and you are independent contractors and neither party will have the power to bind the other or to incur obligations on the other's behalf without the other party's prior written consent.
(b) U.S. Federal Agency Entities. The Services were developed solely at private expense and are commercial computer software and related documentation within the meaning of the applicable U.S. Federal Acquisition Regulation and agency supplements thereto.
(c) Copyright Complaints. If you believe that your intellectual property rights have been infringed, please send notice to the address below or fill out this form. We may delete or disable content alleged to be infringing and may terminate accounts of repeat infringers.
(d) Assignment and Delegation. You may not assign or delegate any rights or obligations under these Terms, including in connection with a change of control. Any purported assignment and delegation shall be null and void. We may assign these Terms in connection with a merger, acquisition or sale of all or substantially all of our assets, or to any affiliate or as part of a corporate reorganization.
(e) Modifications. We may amend these Terms from time to time by posting a revised version on the website, or if an update materially adversely affects your rights or obligations under these Terms we will provide notice to you either by emailing the email associated with your account or providing an in-product notification. Those changes will become effective as soon as legally allowable by local law. All other changes will be effective immediately. Your continued use of the Services after any change means you agree to such change.
(f) Notices. All notices will be in writing. We may notify you using the registration information you provided or the email address associated with your use of the Services.
(g) Waiver and Severability. If you do not comply with these Terms, and Stakeholders do not take action right away, this does not mean Stakeholders are giving up any of our rights. Except as provided in Section 8, if any part of these Terms is determined to be invalid or unenforceable by a court of competent jurisdiction, that term will be enforced to the maximum extent permissible and it will not affect the enforceability of any other terms.
(h) Export Controls. The Services may not be used in or for the benefit of, exported, or re-exported (a) into any U.S. embargoed countries (collectively, the "Embargoed Countries") or (b) to anyone on the U.S. Treasury Department's list of Specially Designated Nationals, any other restricted party lists (existing now or in the future) identified by the Office of Foreign Asset Control, or the U.S. Department of Commerce Denied Persons List or Entity List, or any other restricted party lists (collectively, "Restricted Party Lists"). You represent and warrant that you are not located in any Embargoed Countries and not on any such restricted party lists. You must comply with all applicable laws related to Embargoed Countries or Restricted Party Lists, including any requirements or obligations to know your end users directly.
(i) Equitable Remedies. You acknowledge that if you violate or breach these Terms, it may cause irreparable harm to Stakeholders and our affiliates, and Stakeholders shall have the right to seek injunctive relief against you in addition to any other legal remedies.
(j) Entire Agreement. These Terms and any policies incorporated in these Terms contain the entire agreement between you and Stakeholders regarding the use of the Services and, other than any Service specific terms of use or any applicable enterprise agreements, supersedes any prior or contemporaneous agreements, communications, or understandings between you and Stakeholders on that subject.
(k) Jurisdiction, Venue and Choice of Law. These Terms will be governed by the laws of the State of California, excluding California's conflicts of law rules or principles. Except as provided in the "Dispute Resolution" section, all claims arising out of or relating to these Terms will be brought exclusively in the federal or state courts of San Francisco County, California, USA.

# Attachment A
## Use Restrictions

You agree not to use the Model or Derivatives of the Model:
- In any way that violates any applicable national, federal, state, local or international law or regulation;
- For the purpose of exploiting, harming or attempting to exploit or harm minors in any way;
- To generate or disseminate verifiably false information and/or content with the purpose of harming others;
- To generate or disseminate personal identifiable information that can be used to harm an individual;
- To defame, disparage or otherwise harass others;
- For fully automated decision making that adversely impacts an individual's legal rights or otherwise creates or modifies a binding, enforceable obligation;
- For any use intended to or which has the effect of discriminating against or harming individuals or groups based on online or offline social behavior or known or predicted personal or personality characteristics;
- To exploit any of the vulnerabilities of a specific group of persons based on their age, social, physical or mental characteristics, in order to materially distort the behavior of a person pertaining to that group in a manner that causes or is likely to cause that person or another person physical or psychological harm;
- For any use intended to or which has the effect of discriminating against individuals or groups based on legally protected characteristics or categories;
- To provide medical advice or interpret medical results.
- To generate or disseminate information for the purpose to be used for administration of justice, law enforcement, immigration or asylum processes, such as predicting an individual will commit fraud/crime commitment (e.g. by text profiling, drawing causal relationships between assertions made in documents, indiscriminate and arbitrarily-targeted use).
`

const TermsOfServicePage: Component = () => {
  return (
    <Page>
      <PageHeader title={<>Agnaistic Terms of Service</>} />
      <div class="markdown flex flex-col gap-4" innerHTML={markdown.makeHtml(text)}></div>
    </Page>
  )
}

export default TermsOfServicePage
