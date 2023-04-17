describe('side drawer', () => {
  beforeEach(() => {
    cy.visit('/')

    cy.get('[data-cy="side-drawer"]').should('be.visible')
  })

  it('shows the Login menu', () => {
    cy.get('[data-cy="side-drawer"] a').contains('Login').should('be.visible')
  })

  it('shows the anonymous You', () => {
    cy.get('[data-cy="side-drawer-user-handle"]').contains('You', { timeout: 10000 }).should('be.visible')
  })
})
