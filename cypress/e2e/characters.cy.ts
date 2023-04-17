describe('characters page', () => {
  beforeEach(() => {
    cy.visit('/character/list')
  })

  it('contains a single Robot character', () => {
    cy.get('[data-cy="character"]').contains('Robot').should('be.visible')
  })
})
