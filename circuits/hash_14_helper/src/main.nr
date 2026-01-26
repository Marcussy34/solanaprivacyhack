// Hash Helper Circuit - Computes Poseidon hash of 14 elements.
// Used to compute deck commitments in JavaScript without assertions.
//
// This circuit takes all inputs as PRIVATE so they don't appear in
// publicInputs. Only the computed hash is returned as public output.
//
// Usage: Execute this circuit via NoirJS to compute deck commitments.
//
// @author Marcus (ZK Engineer)
// @created Jan 23, 2026

use poseidon::poseidon::bn254::hash_14;

fn main(
    // All inputs are PRIVATE (not pub)
    seed: Field,
    element_0: Field,
    element_1: Field,
    element_2: Field,
    element_3: Field,
    element_4: Field,
    element_5: Field,
    element_6: Field,
    element_7: Field,
    element_8: Field,
    element_9: Field,
    element_10: Field,
    element_11: Field,
    element_12: Field,
) -> pub Field {
    // Build input array: [seed, deck[0], ..., deck[12]]
    let hash_input: [Field; 14] = [
        seed,
        element_0,
        element_1,
        element_2,
        element_3,
        element_4,
        element_5,
        element_6,
        element_7,
        element_8,
        element_9,
        element_10,
        element_11,
        element_12,
    ];

    // Compute and return the Poseidon hash
    hash_14(hash_input)
}

#[test]
fn test_deck_commitment() {
    // Same test values as shuffle_proof
    let seed: Field = 12345;
    let deck: [Field; 13] = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7];

    let result = main(
        seed,
        deck[0], deck[1], deck[2], deck[3],
        deck[4], deck[5], deck[6], deck[7],
        deck[8], deck[9], deck[10], deck[11], deck[12]
    );

    // Expected commitment from shuffle_proof test
    let expected: Field = 0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e;
    assert(result == expected);
}



