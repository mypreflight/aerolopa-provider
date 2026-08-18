Feature: Reporting failures honestly
  As the flight tracker backend
  I want upstream trouble reported with a distinct status and code
  So that a missing configuration is never confused with an outage

  Scenario: An unknown configuration answers not found
    Given AeroLOPA has no seat map for "zz-999"
    When I send a "GET" request to "/seatmap?slug=zz-999"
    Then the response status should be 404
    And the response body should contain:
      """
      {
        "error": {
          "code": "SEAT_MAP_NOT_FOUND",
          "message": "Seat map for configuration zz-999 does not exist.",
          "status": 404
        }
      }
      """

  Scenario: An upstream outage answers bad gateway
    Given AeroLOPA is unavailable for "lh-32n"
    When I send a "GET" request to "/seatmap?slug=lh-32n"
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

  Scenario: A payload that cannot be parsed answers bad gateway
    Given AeroLOPA serves an unreadable payload for "lh-32n"
    When I send a "GET" request to "/seatmap?slug=lh-32n"
    Then the response status should be 502
    And the response body should contain:
      """
      {
        "error": {
          "code": "SEAT_MAP_UNREADABLE",
          "message": "Seat map payload for configuration lh-32n could not be read.",
          "status": 502
        }
      }
      """

  Scenario: An outage while indexing configurations answers bad gateway
    Given AeroLOPA is unavailable for the configuration index
    When I send a "GET" request to "/seatmap?airline=LH&aircraft=32N"
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
    Given AeroLOPA is unavailable for "lh-32n"
    When I send a "GET" request to "/seatmap?slug=lh-32n"
    And I send a "GET" request to "/seatmap?slug=lh-32n"
    Then the response status should be 502
    And AeroLOPA should have been asked for "lh-32n" 2 times
