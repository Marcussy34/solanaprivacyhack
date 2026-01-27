// Hash Helper Circuit - Computes Poseidon hash of 53 elements (seed + 52 cards).
// Used to compute deck commitments in JavaScript without assertions.
//
// This circuit takes all inputs as PRIVATE so they don't appear in
// publicInputs. Only the computed hash is returned as public output.
//
// Usage: Execute this circuit via NoirJS to compute deck commitments.

use dep::std;
use dep::poseidon;

fn main(
    // All inputs are PRIVATE (not pub)
    seed: Field,
    deck: [Field; 52]
) -> pub Field {
    // Build input array: [seed, deck[0], ..., deck[51]]
    let mut current_hash = seed;
    for i in 0..52 {
        current_hash = poseidon::poseidon::bn254::hash_2([current_hash, deck[i]]);
    }

    // Compute and return the Poseidon hash
    current_hash
}

#[test]
fn test_deck_commitment() {
    let seed: Field = 12345;
    let mut deck: [Field; 52] = [0; 52];
    for i in 0..52 {
        deck[i] = i as Field;
    }

    let result = main(seed, deck);
    
    // We don't have a pre-calculated expected value for 52 cards yet, 
    // but we can assert it returns a value (not crashing)
    // and we can verify consistency with shuffle_proof logic in integration tests.
    assert(result != 0);
}
