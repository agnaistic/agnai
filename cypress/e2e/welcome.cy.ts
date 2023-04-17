describe('welcome page', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('shows the welcome text', () => {
    cy.contains('Welcome to AgnAIstic').should('be.visible')
  })
})
