Feature: Reporting failures honestly
  As the flight tracker backend
  I want upstream trouble reported with a distinct status and code
  So that an outage is never mistaken for an empty catalogue

  Scenario: An upstream outage answers bad gateway
    Given AeroLOPA is unavailable for the layout index
    When I invoke the function
    Then the response status should be 502
    And the response body should contain:
      """
      {
        "error": {
          "code": "AEROLOPA_UNAVAILABLE",
          "message": "AeroLOPA is unavailable.",
          "status": 502
        }
      }
      """

  Scenario: A failed lookup is not cached
    Given AeroLOPA is unavailable for the layout index
    When I invoke the function
    And I invoke the function
    Then the response status should be 502
    And AeroLOPA should have been asked for the layout index 2 times
