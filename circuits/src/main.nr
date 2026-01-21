use poseidon::poseidon::bn254::hash_14;

fn main(
    // Private inputs
    seed: Field,
    shuffled_deck: [u8; 13],

    // Public inputs
    deck_commitment: pub Field,
    original_deck: pub [u8; 13]
) -> pub Field {
    // 1. Verify shuffled_deck is a permutation of original_deck
    // Check that every card in original_deck appears exactly once in shuffled_deck
    let mut used = [false; 13];
    for i in 0..13 {
        let card = shuffled_deck[i];
        // Card must be valid (0-12)
        assert(card < 13);
        // Card must not have been used yet
        assert(!used[card as u32]);
        used[card as u32] = true;
    }

    // 2. Verify commitment matches shuffled deck + seed
    // Convert shuffled_deck to Field array for hashing
    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled_deck[i] as Field;
    }

    let computed_commitment = hash_14(hash_input);
    assert(computed_commitment == deck_commitment);

    // Return the commitment for verification
    computed_commitment
}

#[test]
fn test_valid_shuffle() {
    // Original deck: 0-12
    let original: [u8; 13] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    // Shuffled deck (valid permutation)
    let shuffled: [u8; 13] = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7];
    let seed: Field = 12345;

    // Calculate commitment
    let mut hash_input: [Field; 14] = [0; 14];
    hash_input[0] = seed;
    for i in 0..13 {
        hash_input[i + 1] = shuffled[i] as Field;
    }
    let commitment = hash_14(hash_input);

    let result = main(seed, shuffled, commitment, original);
    assert(result == commitment);
}
